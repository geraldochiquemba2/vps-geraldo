import { connect } from 'cloudflare:sockets';

const userID = 'ad6802e8-d698-4c6e-8121-50e588fbc8d3';

export async function onRequest(context) {
    const { request } = context;
    const upgradeHeader = request.headers.get('Upgrade');

    if (upgradeHeader !== 'websocket') {
        const url = new URL(request.url);
        return new Response(`VLESS Gateway Online: ${url.hostname}`, { status: 200 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    server.accept();

    // Handshake e Relay
    vlessOverWS(server);

    return new Response(null, {
        status: 101,
        webSocket: client,
    });
}

async function vlessOverWS(webSocket) {
    let remoteSocket = null;
    let isFirstPacket = true;

    webSocket.addEventListener('message', async (event) => {
        const chunk = event.data;
        
        if (isFirstPacket) {
            isFirstPacket = false;
            
            // Handshake VLESS (mínimo 18 bytes)
            if (chunk.byteLength < 18) {
                webSocket.close();
                return;
            }

            const view = new DataView(chunk);
            // Protocol Version (view.getUint8(0))
            // UUID (16 bytes)
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
                // Conectar ao destino final (recurso especial da Cloudflare)
                remoteSocket = connect({ hostname: address, port: port });
                
                // HEADER DE RESPOSTA VLESS (Obrigatório: 00 00)
                webSocket.send(new Uint8Array([0, 0]));

                // Passar o resto dos dados se existirem no primeiro pacote
                const extraData = chunk.slice(addressEnd);
                if (extraData.byteLength > 0) {
                    const writer = remoteSocket.writable.getWriter();
                    await writer.write(new Uint8Array(extraData));
                    writer.releaseLock();
                }

                // Fluxo de dados bidireccional
                relayData(remoteSocket, webSocket);
                
            } catch (err) {
                webSocket.close();
            }
        } else {
            // Pacotes subsequentes (Raw Data)
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
            // Enviar dados vindos da internet para a App de VPN
            ws.send(value);
        }
    } catch (e) {
        // Erro silencioso
    } finally {
        ws.close();
        reader.releaseLock();
    }
}
