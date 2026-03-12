import { connect } from 'cloudflare:sockets';

const userID = 'ad6802e8-d698-4c6e-8121-50e588fbc8d3';

export async function onRequest(context) {
    const { request } = context;
    const upgradeHeader = request.headers.get('Upgrade');

    if (upgradeHeader !== 'websocket') {
        return new Response('VLESS Tunnel Active', { status: 200 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();

    // VLESS over WebSocket implementation
    handleVLESS(server);

    return new Response(null, {
        status: 101,
        webSocket: client,
    });
}

async function handleVLESS(webSocket) {
    let remoteSocket = null;

    webSocket.addEventListener('message', async (event) => {
        const message = event.data;
        
        if (!remoteSocket) {
            // First packet contains VLESS header
            const { address, port, decodedData } = parseVLESSHeader(message);
            
            if (!address || !port) {
                webSocket.close();
                return;
            }

            try {
                remoteSocket = connect({ hostname: address, port: port });
                
                // Forward initial data if any
                if (decodedData && decodedData.length > 0) {
                    const writer = remoteSocket.writable.getWriter();
                    await writer.write(decodedData);
                    writer.releaseLock();
                }

                // Pipe remote to websocket
                pipeRemoteToWS(remoteSocket, webSocket);
                // Pipe websocket to remote
                pipeWSToRemote(webSocket, remoteSocket);
                
            } catch (err) {
                webSocket.close();
            }
        } else {
            // Further packets are raw data
            const writer = remoteSocket.writable.getWriter();
            await writer.write(new Uint8Array(message));
            writer.releaseLock();
        }
    });

    webSocket.addEventListener('close', () => {
        if (remoteSocket) remoteSocket.close();
    });
}

function parseVLESSHeader(buffer) {
    const view = new DataView(buffer);
    
    // Check version (1 byte)
    // const version = view.getUint8(0);
    
    // Check UUID (16 bytes) - simplified for this implementation
    // We assume the client is using the correct UUID
    
    // Read Addons length (1 byte)
    const addonLen = view.getUint8(17);
    
    // Read Command (1 byte) - 1 for TCP, 2 for UDP
    const command = view.getUint8(18 + addonLen);
    
    // Read Port (2 bytes)
    const port = view.getUint16(18 + addonLen + 1);
    
    // Read Address Type (1 byte)
    const addressType = view.getUint8(18 + addonLen + 3);
    
    let address = '';
    let addressEnd = 0;

    if (addressType === 1) { // IPv4
        address = [
            view.getUint8(18 + addonLen + 4),
            view.getUint8(18 + addonLen + 5),
            view.getUint8(18 + addonLen + 6),
            view.getUint8(18 + addonLen + 7)
        ].join('.');
        addressEnd = 18 + addonLen + 8;
    } else if (addressType === 2) { // Domain
        const domainLen = view.getUint8(18 + addonLen + 4);
        address = new TextDecoder().decode(buffer.slice(18 + addonLen + 5, 18 + addonLen + 5 + domainLen));
        addressEnd = 18 + addonLen + 5 + domainLen;
    } else if (addressType === 3) { // IPv6
        // Simplified
        addressEnd = 18 + addonLen + 20;
    }

    const decodedData = buffer.slice(addressEnd);
    return { address, port, decodedData };
}

async function pipeRemoteToWS(remote, ws) {
    const reader = remote.readable.getReader();
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            ws.send(value);
        }
    } catch (e) {
        ws.close();
    } finally {
        reader.releaseLock();
    }
}

async function pipeWSToRemote(ws, remote) {
    // Already handled in the 'message' event listener for simplicity
}
