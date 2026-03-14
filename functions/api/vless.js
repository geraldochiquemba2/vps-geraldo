import { connect } from 'cloudflare:sockets';

export async function onRequest(context) {
  const { request } = context;
  const upgradeHeader = request.headers.get('Upgrade');

  if (upgradeHeader !== 'websocket') {
    return new Response(`VLESS Gateway Online (Pages). Use WebSocket upgrade.`, { status: 200 });
  }

  const [client, server] = Object.values(new WebSocketPair());
  server.accept();

  // Handshake e Relay
  handleVlessOverWS(server);

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

async function handleVlessOverWS(webSocket) {
  let remoteSocket = null;
  let isFirstPacket = true;

  webSocket.addEventListener('message', async (event) => {
    const chunk = event.data;
    
    if (isFirstPacket) {
      isFirstPacket = false;
      
      if (chunk.byteLength < 18) {
        webSocket.close();
        return;
      }

      const view = new DataView(chunk);
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
        remoteSocket = connect({ hostname: address, port: port });
        webSocket.send(new Uint8Array([0, 0]));

        const extraData = chunk.slice(addressEnd);
        if (extraData.byteLength > 0) {
          const writer = remoteSocket.writable.getWriter();
          await writer.write(new Uint8Array(extraData));
          writer.releaseLock();
        }

        relayData(remoteSocket, webSocket);
        
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

async function relayData(remote, ws) {
  const reader = remote.readable.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      ws.send(value);
    }
  } catch (e) {
  } finally {
    ws.close();
    reader.releaseLock();
  }
}
