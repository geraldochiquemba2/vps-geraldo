import { connect } from 'cloudflare:sockets';

const userID = 'ad6802e8-d698-4c6e-8121-50e588fbc8d3';

export async function onRequest(context) {
    const { request } = context;
    if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('VLESS Engine Active (v3.0 EdgeTunnel Spec)', { status: 200 });
    }

    const [client, webSocket] = Object.values(new WebSocketPair());
    webSocket.accept();

    const earlyDataHeader = request.headers.get('sec-websocket-protocol') || '';
    let earlyData = null;
    if (earlyDataHeader) {
        earlyData = base64ToArrayBuffer(earlyDataHeader);
    }

    handleVlessSession(webSocket, earlyData);

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

// WS_READY_STATE_OPEN
const WS_READY_STATE_OPEN = 1;

async function handleVlessSession(webSocket, earlyData) {
    let remoteSocket = null;
    let isHeaderProcessed = false;
    let remoteWriter = null;

    async function processMessage(chunk) {
        if (!isHeaderProcessed) {
            isHeaderProcessed = true;
            try {
                await parseAndConnect(chunk);
            } catch (err) {
                console.error("Handshake error", err);
                webSocket.close();
            }
        } else {
            if (remoteWriter) {
                try {
                    await remoteWriter.write(new Uint8Array(chunk));
                } catch (e) {
                    webSocket.close();
                }
            }
        }
    }

    async function parseAndConnect(vlessBuffer) {
        if (vlessBuffer.byteLength < 24) throw new Error('invalid data');

        const version = new Uint8Array(vlessBuffer.slice(0, 1))[0];
        
        // Skip user Validation for simplicity and maximum compatibility
        
        const optLength = new Uint8Array(vlessBuffer.slice(17, 18))[0];
        const command = new Uint8Array(vlessBuffer.slice(18 + optLength, 18 + optLength + 1))[0];

        if (command !== 1) throw new Error('Only TCP supported'); // Only TCP

        const portIndex = 18 + optLength + 1;
        const portRemote = new DataView(vlessBuffer.slice(portIndex, portIndex + 2)).getUint16(0);

        let addressIndex = portIndex + 2;
        const addressType = new Uint8Array(vlessBuffer.slice(addressIndex, addressIndex + 1))[0];
        
        let addressLength = 0;
        let addressValueIndex = addressIndex + 1;
        let addressValue = '';

        if (addressType === 1) { // IPv4
            addressLength = 4;
            addressValue = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join('.');
        } else if (addressType === 2) { // Domain
            addressLength = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + 1))[0];
            addressValueIndex += 1;
            addressValue = new TextDecoder().decode(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
        } else if (addressType === 3) { // IPv6
            addressLength = 16;
            const dataView = new DataView(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
            const ipv6 = [];
            for (let i = 0; i < 8; i++) {
                ipv6.push(dataView.getUint16(i * 2).toString(16));
            }
            addressValue = ipv6.join(':');
        } else {
            throw new Error(`Invalid addressType: ${addressType}`);
        }

        const rawDataIndex = addressValueIndex + addressLength;
        const rawClientData = vlessBuffer.slice(rawDataIndex);

        remoteSocket = connect({ hostname: addressValue, port: portRemote });
        remoteWriter = remoteSocket.writable.getWriter();
        
        // Write the initial client payload
        if (rawClientData.byteLength > 0) {
            await remoteWriter.write(new Uint8Array(rawClientData));
        }
        remoteWriter.releaseLock();

        // This is the critical fix from zizifn: 
        // We MUST combine the VLESS response header with the first chunk of data from the remote socket
        const vlessResponseHeader = new Uint8Array([version, 0]);
        remoteSocketToWS(remoteSocket, webSocket, vlessResponseHeader);
    }

    if (earlyData) await processMessage(earlyData);

    webSocket.addEventListener('message', async (event) => {
        await processMessage(event.data);
    });

    const cleanup = () => {
        if (remoteSocket) {
            try { remoteSocket.close(); } catch(e){}
        }
    };
    webSocket.addEventListener('close', cleanup);
    webSocket.addEventListener('error', cleanup);
}

async function remoteSocketToWS(remoteSocket, webSocket, vlessResponseHeader) {
    let vlessHeader = vlessResponseHeader;
    
    await remoteSocket.readable.pipeTo(new WritableStream({
        async write(chunk, controller) {
            if (webSocket.readyState !== WS_READY_STATE_OPEN) {
                controller.error('webSocket not open');
            }
            if (vlessHeader) {
                // Combine header and chunk into a single WebSocket frame
                webSocket.send(await new Blob([vlessHeader, chunk]).arrayBuffer());
                vlessHeader = null;
            } else {
                webSocket.send(chunk);
            }
        },
        close() {
            try { webSocket.close(); } catch(e){}
        },
        abort(reason) {
            try { webSocket.close(); } catch(e){}
        }
    })).catch((error) => {
        console.error("Pipe error:", error);
        try { webSocket.close(); } catch(e){}
    });
}
