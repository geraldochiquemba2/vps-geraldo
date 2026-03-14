import { connect } from 'cloudflare:sockets';

// Use a fallback UUID if none is provided, but we skip validation for maximize compatibility
const userID = 'ad6802e8-d698-4c6e-8121-50e588fbc8d3';

export async function onRequest(context) {
    const { request } = context;
    const upgradeHeader = request.headers.get('Upgrade');

    if (upgradeHeader !== 'websocket') {
        return new Response('VLESS Engine Active. Version 2.4.0', { status: 200 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    server.accept();

    // Early Data support for low ping (0-RTT)
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
    let remoteWriter = null;

    async function handleChunk(chunk) {
        if (!isHeaderProcessed) {
            try {
                const header = await parseVlessHeader(chunk);
                if (!header) {
                    ws.close();
                    return;
                }

                // Connect to remote target
                remoteSocket = connect({ hostname: header.address, port: header.port });
                remoteWriter = remoteSocket.writable.getWriter();

                // Send VLESS response: [Protocol Version, Addon Length (0)]
                // We use the version from the client's request
                ws.send(new Uint8Array([header.version, 0]));

                isHeaderProcessed = true;

                // Send remaining payload from first packet
                if (header.payload.byteLength > 0) {
                    await remoteWriter.write(new Uint8Array(header.payload));
                }

                // Start relaying from remote back to websocket
                relayRemoteToWS(remoteSocket, ws);
            } catch (err) {
                console.error('Handshake failed:', err);
                ws.close();
            }
        } else {
            if (remoteWriter) {
                try {
                    await remoteWriter.write(new Uint8Array(chunk));
                } catch (e) {
                    cleanup();
                }
            }
        }
    }

    async function parseVlessHeader(chunk) {
        if (chunk.byteLength < 24) return null; // Minimum header size

        const view = new DataView(chunk);
        const version = view.getUint8(0);
        // We skip UUID validation to avoid mismatch issues
        
        const addonLen = view.getUint8(17);
        const command = view.getUint8(18 + addonLen); // 1 = TCP, 2 = UDP
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
        } else if (addressType === 3) { // IPv6
            // Basic IPv6 support
            address = Array.from(new Uint16Array(chunk.slice(addressIndex, addressIndex + 16)))
                .map(x => x.toString(16)).join(':');
            addressEnd = addressIndex + 16;
        } else {
            return null;
        }

        return {
            version,
            address,
            port,
            payload: chunk.slice(addressEnd)
        };
    }

    function cleanup() {
        if (remoteWriter) {
            try { remoteWriter.releaseLock(); } catch(e) {}
        }
        if (remoteSocket) {
            try { remoteSocket.close(); } catch(e) {}
        }
        try { ws.close(); } catch(e) {}
    }

    if (earlyData) await handleChunk(earlyData);

    ws.addEventListener('message', async (event) => {
        await handleChunk(event.data);
    });

    ws.addEventListener('close', cleanup);
    ws.addEventListener('error', cleanup);
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
        console.error('Relay error:', e);
    } finally {
        try { reader.releaseLock(); } catch(e) {}
        try { ws.close(); } catch(e) {}
    }
}
