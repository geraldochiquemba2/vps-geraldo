import { Hono } from 'hono';
import { connect } from 'cloudflare:sockets';

const app = new Hono();

// VLESS UUID (Default)
const USER_ID = 'ad6802e8-d698-4c6e-8121-50e588fbc8d3';

// Health Check API
app.get('/api/health', (c) => {
  return c.json({
    status: 'online',
    version: '2.1.0',
    platform: 'Cloudflare Workers (Unified Architecture)',
    timestamp: new Date().toISOString()
  });
});

// VLESS Gateway Logic
app.all('/api/vless', async (c) => {
  const request = c.req.raw;
  const upgradeHeader = request.headers.get('Upgrade');

  // If not a websocket, return status info
  if (upgradeHeader !== 'websocket') {
    return c.text(`VLESS Gateway active at ${new URL(request.url).hostname}. Use WebSocket upgrade.`, 200);
  }

  const [client, server] = Object.values(new WebSocketPair());
  server.accept();

  // Support for 0-RTT / Early Data
  const earlyDataHeader = request.headers.get('sec-websocket-protocol') || '';
  
  handleVlessConnection(server, earlyDataHeader);

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
});

// Assets Fallback (served by Cloudflare Assets binding)
app.all('*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Assets not configured. Please build and deploy with Wrangler.', 500);
});

async function handleVlessConnection(webSocket, earlyData) {
  let remoteSocket = null;
  let isFirstPacket = true;

  webSocket.addEventListener('message', async (event) => {
    const chunk = event.data;
    
    if (isFirstPacket) {
      isFirstPacket = false;
      
      // Basic VLESS Handshake Check
      if (chunk.byteLength < 18) {
        webSocket.close();
        return;
      }

      const view = new DataView(chunk);
      // Skip protocol version (0), UUID (1-16), and addon length (17)
      const addonLen = view.getUint8(17);
      const addressIndex = 18 + addonLen + 3;
      
      if (chunk.byteLength <= addressIndex) {
        webSocket.close();
        return;
      }

      const port = view.getUint16(18 + addonLen + 1);
      const addressType = view.getUint8(18 + addonLen + 3);
      
      let address = '';
      let addressEnd = 0;

      if (addressType === 1) { // IPv4
        address = new Uint8Array(chunk.slice(addressIndex + 1, addressIndex + 5)).join('.');
        addressEnd = addressIndex + 5;
      } else if (addressType === 2) { // Domain
        const domainLen = view.getUint8(addressIndex + 1);
        address = new TextDecoder().decode(chunk.slice(addressIndex + 2, addressIndex + 2 + domainLen));
        addressEnd = addressIndex + 2 + domainLen;
      } else {
        webSocket.close();
        return;
      }

      try {
        // Connect to the target using Cloudflare Sockets
        remoteSocket = connect({ hostname: address, port: port });
        
        // VLESS Response Header (Fixed 00 00)
        webSocket.send(new Uint8Array([0, 0]));

        // Send remaining data from the first packet
        const extraData = chunk.slice(addressEnd);
        if (extraData.byteLength > 0) {
          const writer = remoteSocket.writable.getWriter();
          await writer.write(new Uint8Array(extraData));
          writer.releaseLock();
        }

        // Bridge data
        bridge(remoteSocket, webSocket);
        
      } catch (err) {
        webSocket.close();
      }
    } else {
      if (remoteSocket && remoteSocket.writable) {
        const writer = remoteSocket.writable.getWriter();
        await writer.write(new Uint8Array(chunk));
        writer.releaseLock();
      }
    }
  });

  webSocket.addEventListener('close', () => {
    if (remoteSocket) remoteSocket.close();
  });

  webSocket.addEventListener('error', () => {
    if (remoteSocket) remoteSocket.close();
  });
}

async function bridge(remote, ws) {
  const reader = remote.readable.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      ws.send(value);
    }
  } catch (e) {
    // Connection lost
  } finally {
    ws.close();
    reader.releaseLock();
  }
}

export default app;
