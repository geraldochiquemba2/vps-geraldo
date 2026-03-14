import { connect } from 'cloudflare:sockets';

const UUID = ""; // Any UUID works as we don't validate in this version for simplicity

export async function onRequest(context) {
  const { request } = context;
  const upgradeHeader = request.headers.get('Upgrade');

  if (upgradeHeader !== 'websocket') {
    return new Response(`VLESS Gateway Online. Timestamp: ${new Date().toISOString()}`, { status: 200 });
  }

  const [client, server] = Object.values(new WebSocketPair());
  server.accept();

  // Handle Early Data (0-RTT)
  const earlyDataHeader = request.headers.get('sec-websocket-protocol');
  let earlyData = null;
  if (earlyDataHeader) {
      try {
          earlyData = base64ToArrayBuffer(earlyDataHeader);
      } catch (e) {
          console.error('Failed to decode early data', e);
      }
  }

  handleVlessConnection(server, earlyData);

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

function base64ToArrayBuffer(base64) {
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

async function handleVlessConnection(webSocket, earlyData) {
  let remoteSocket = null;
  let isFirstPacket = true;

  const processChunk = async (chunk) => {
    if (isFirstPacket) {
      isFirstPacket = false;
      
      const view = new DataView(chunk);
      if (chunk.byteLength < 18) {
          webSocket.close();
          return;
      }

      // VLESS Header: Version (1) + UUID (16) + Addon Length (1)
      const addonLen = view.getUint8(17);
      const commandIndex = 18 + addonLen;
      const portIndex = commandIndex + 1;
      const addressTypeIndex = commandIndex + 3;

      if (chunk.byteLength <= addressTypeIndex) {
        webSocket.close();
        return;
      }

      const port = view.getUint16(portIndex);
      const addressType = view.getUint8(addressTypeIndex);
      
      let address = '';
      let addressEnd = 0;

      if (addressType === 1) { // IPv4
        address = new Uint8Array(chunk.slice(addressTypeIndex + 1, addressTypeIndex + 5)).join('.');
        addressEnd = addressTypeIndex + 5;
      } else if (addressType === 2) { // Domain
        const domainLen = view.getUint8(addressTypeIndex + 1);
        address = new TextDecoder().decode(chunk.slice(addressTypeIndex + 2, addressTypeIndex + 2 + domainLen));
        addressEnd = addressTypeIndex + 2 + domainLen;
      } else if (addressType === 3) { // IPv6
        address = Array.from(new Uint16Array(chunk.slice(addressTypeIndex + 1, addressTypeIndex + 17)))
            .map(x => x.toString(16)).join(':');
        addressEnd = addressTypeIndex + 17;
      } else {
        webSocket.close();
        return;
      }

      try {
        remoteSocket = connect({ hostname: address, port: port });
        
        const writer = remoteSocket.writable.getWriter();
        await webSocket.send(new Uint8Array([0, 0]));

        const extraData = chunk.slice(addressEnd);
        if (extraData.byteLength > 0) {
          await writer.write(new Uint8Array(extraData));
        }
        writer.releaseLock();

        relayData(remoteSocket, webSocket);
      } catch (err) {
        console.error(`Connection to ${address}:${port} failed:`, err);
        webSocket.close();
      }
    } else {
      if (remoteSocket && remoteSocket.writable) {
        const writer = remoteSocket.writable.getWriter();
        await writer.write(new Uint8Array(chunk));
        writer.releaseLock();
      }
    }
  };

  // If there's early data, process it first
  if (earlyData) {
      await processChunk(earlyData);
  }

  webSocket.addEventListener('message', async (event) => {
    await processChunk(event.data);
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
