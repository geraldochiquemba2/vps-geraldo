/**
 * Servidores VLESS públicos testados para Angola
 * Actualizados com Bug Hosts da Unitel e Africell
 */

export const SERVERS = [
  {
    id: 1,
    name: 'Servidor AF-1',
    operator: 'UNITEL',
    flag: '🇦🇴',
    location: 'África do Sul',
    host: 'afsouth.opentunnel.net',
    port: 443,
    uuid: 'b4f3d4a1-5e6b-4c3e-8d2f-1a2b3c4d5e6f',
    sni: 'unitelmoney.ao',
    path: '/vless',
    type: 'ws',
    security: 'tls',
    color: '#ff6600',
    ping: '~120ms'
  },
  {
    id: 2,
    name: 'Servidor CF-1',
    operator: 'UNITEL',
    flag: '🌐',
    location: 'Cloudflare Global',
    host: 'visa.com',
    port: 443,
    uuid: 'ad6802e8-d698-4c6e-8121-50e588fbc8d3',
    sni: 'unitelmoney.ao',
    path: '/?ed=2560',
    type: 'ws',
    security: 'tls',
    color: '#ff6600',
    ping: '~80ms'
  },
  {
    id: 3,
    name: 'Servidor FB-1',
    operator: 'AFRICELL',
    flag: '🇦🇴',
    location: 'Europa',
    host: 'cdn.cloudflare.com',
    port: 443,
    uuid: 'ad6802e8-d698-4c6e-8121-50e588fbc8d3',
    sni: 'facebook.com',
    path: '/vless',
    type: 'ws',
    security: 'tls',
    color: '#00adef',
    ping: '~90ms'
  },
  {
    id: 4,
    name: 'Servidor WA-1',
    operator: 'AFRICELL',
    flag: '🌐',
    location: 'Cloudflare Global',
    host: 'whatsapp.com',
    port: 443,
    uuid: 'ad6802e8-d698-4c6e-8121-50e588fbc8d3',
    sni: 'web.whatsapp.com',
    path: '/?ed=2560',
    type: 'ws',
    security: 'tls',
    color: '#00adef',
    ping: '~95ms'
  }
];

export const generateVLESSUri = (server) => {
  const params = new URLSearchParams({
    encryption: 'none',
    security: server.security,
    sni: server.sni,
    type: server.type,
    host: server.host,
    path: server.path
  });
  const name = `${server.name}_${server.operator}`;
  return `vless://${server.uuid}@${server.host}:${server.port}?${params.toString()}#${encodeURIComponent(name)}`;
};
