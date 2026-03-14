import { connect } from 'cloudflare:sockets';

const userID = 'ad6802e8-d698-4c6e-8121-50e588fbc8d3';

export async function onRequest(context) {
    const { request } = context;
    if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('VLESS Engine Active (v2.3.0).', { status: 200 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    server.accept();

    const earlyDataHeader = request.headers.get('sec-websocket-protocol');
    let earlyData = null;
    if (earlyDataHeader) {
        try {
            earlyData = base64ToArrayBuffer(earlyDataHeader);
        } catch (e) {
            console.error('EarlyData error:', e);
        }
    }

    handleVlessSession(server, earlyData);

    return new Response(null, {
        status: 101,
        webSocket: client,
    });
}

function base64ToArrayBuffer(base64) {
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

async function handleVlessSession(ws, earlyData) {
    let remoteSocket = null;
    let isHeaderProcessed = false;
    let dataQueue = [];

    async function processMessage(chunk) {
        if (!isHeaderProcessed) {
            isHeaderProcessed = true;
            await parseVlessHeader(chunk);
        } else {
            if (remoteSocket && remoteSocket.writable) {
                const writer = remoteSocket.writable.getWriter();
                await writer.write(new Uint8Array(chunk));
                writer.releaseLock();
            } else {
                dataQueue.push(chunk);
            }
        }
    }

    async function parseVlessHeader(chunk) {
        const view = new DataView(chunk);
        
        // Offset Logic
        const addonLen = view.getUint8(17);
        const port = view.getUint16(18 + addonLen + 1);
        const addressType = view.getUint8(18 + addonLen + 3);
        
        let address = '';
        let addressEnd = 0;
        let addressIndex = 18 + addonLen + 4;

        if (addressType === 1) { // IPv4
            address = new Uint8Array(chunk.slice(addressIndex, addressIndex + 4)).join('.');
            addressEnd = addressIndex + 4;
        } else if (addressType === 2) { // Domain
            const domainLen = view.getUint8(addressIndex);
            address = new TextDecoder().decode(chunk.slice(addressIndex + 1, addressIndex + 1 + domainLen));
            addressEnd = addressIndex + 1 + domainLen;
        } else {
            ws.close(); return;
        }

        try {
            remoteSocket = connect({ hostname: address, port: port });
            
            // Send VLESS response [version, addonLen]
            ws.send(new Uint8Array([0, 0]));

            // Write initial payload
            const writer = remoteSocket.writable.getWriter();
            const initialPayload = chunk.slice(addressEnd);
            if (initialPayload.byteLength > 0) {
                await writer.write(new Uint8Array(initialPayload));
            }
            
            // Write queued data
            for (const queued of dataQueue) {
                await writer.write(new Uint8Array(queued));
            }
            dataQueue = [];
            writer.releaseLock();

            // Start relay
            relayRemoteToWS(remoteSocket, ws);
        } catch (err) {
            console.error(`Socket fail: ${address}:${port}`, err);
            ws.close();
        }
    }

    if (earlyData) await processMessage(earlyData);

    ws.addEventListener('message', async (event) => {
        await processMessage(event.data);
    });

    ws.addEventListener('close', () => remoteSocket?.close());
    ws.addEventListener('error', () => remoteSocket?.close());
}

async function relayRemoteToWS(remote, ws) {
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
    }
}
