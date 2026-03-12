import { connect } from 'cloudflare:sockets';

const userID = 'ad6802e8-d698-4c6e-8121-50e588fbc8d3';

export async function onRequest(context) {
    const { request } = context;
    const upgradeHeader = request.headers.get('Upgrade');

    if (upgradeHeader !== 'websocket') {
        const url = new URL(request.url);
        return new Response(`VLESS Tunnel Active on ${url.hostname}`, { status: 200 });
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
    let isFirstPacket = true;

    webSocket.addEventListener('message', async (event) => {
        const message = event.data;
        
        if (isFirstPacket) {
            isFirstPacket = false;
            // First packet contains VLESS header
            const { address, port, decodedData } = parseVLESSHeader(message);
            
            if (!address || !port) {
                webSocket.close();
                return;
            }

            try {
                remoteSocket = connect({ hostname: address, port: port });
                
                // VLESS Response Header: 1st byte is version (0), 2nd is addon length (0)
                // This is MANDATORY for the client to accept the connection.
                webSocket.send(new Uint8Array([0, 0]));

                // Forward initial data if any (after the header)
                if (decodedData && decodedData.byteLength > 0) {
                    const writer = remoteSocket.writable.getWriter();
                    await writer.write(decodedData);
                    writer.releaseLock();
                }

                // Pipe remote back to websocket
                pipeRemoteToWS(remoteSocket, webSocket);
                
            } catch (err) {
                webSocket.close();
            }
        } else {
            // Further packets are raw data
            if (remoteSocket && remoteSocket.writable) {
                const writer = remoteSocket.writable.getWriter();
                await writer.write(new Uint8Array(message));
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

function parseVLESSHeader(buffer) {
    const view = new DataView(buffer);
    
    // UUID is 16 bytes starting at index 1
    // For now we trust the client to avoid extra complexity, but in production we'd verify the UUID.
    
    const addonLen = view.getUint8(17);
    const command = view.getUint8(18 + addonLen); // 1: TCP, 2: UDP
    const port = view.getUint16(18 + addonLen + 1);
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
        addressEnd = 18 + addonLen + 20; // Simplified
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
        // Silently fail or log
    } finally {
        ws.close();
        reader.releaseLock();
    }
}
