/**
 * Cloudflare Pages Function - VLESS Tunnel
 * Este código corre no mesmo domínio do teu site.
 */

import { connect } from 'cloudflare:sockets';

const userID = 'ad6802e8-d698-4c6e-8121-50e588fbc8d3';
const proxyIP = '8.212.181.166';

export async function onRequest(context) {
    const { request } = context;
    const upgradeHeader = request.headers.get('Upgrade');

    if (upgradeHeader !== 'websocket') {
        const url = new URL(request.url);
        return new Response(`Túnel VLESS Ativo no domínio: ${url.hostname}\nConfigura o teu site para apontar para este endereço.`, { status: 200 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();

    // Aqui o código faria a ponte TCP/WebSocket para o protocolo VLESS
    // Para o teu portal de internet grátis em Angola, este Worker aceita as conexões
    // que o v2rayNG ou NapsternetV enviam disfarçadas de Bug Host.

    return new Response(null, {
        status: 101,
        webSocket: client,
    });
}
