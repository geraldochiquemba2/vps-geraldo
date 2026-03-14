/**
 * Servidores VLESS públicos testados para Angola
 * Actualizados com Bug Hosts da Unitel e Africell
 */

export const SERVERS = [
  {
    id: 1,
    name: 'Unitel - Money Speed',
    operator: 'UNITEL',
    flag: '🇦🇴',
    location: 'Cloudflare Edge',
    host: 'unitelmoney.ao', // The BUG HOST (SNI)
    port: 443,
    uuid: 'ad6802e8-d698-4c6e-8121-50e588fbc8d3',
    sni: 'unitelmoney.ao',
    path: '/api/vless',
    type: 'ws',
    security: 'tls',
    color: '#ff6600',
    ping: '~80ms'
  },
  {
    id: 2,
    name: 'Unitel - Global Net',
    operator: 'UNITEL',
    flag: '🌐',
    location: 'Cloudflare Global',
    host: 'unitel.it.ao',
    port: 443,
    uuid: 'ad6802e8-d698-4c6e-8121-50e588fbc8d3',
    sni: 'unitel.it.ao',
    path: '/api/vless',
    type: 'ws',
    security: 'tls',
    color: '#ff6600',
    ping: '~95ms'
  },
  {
    id: 3,
    name: 'Africell - FB Speed',
    operator: 'AFRICELL',
    flag: '🇦🇴',
    location: 'Cloudflare Edge',
    host: 'facebook.com',
    port: 443,
    uuid: 'ad6802e8-d698-4c6e-8121-50e588fbc8d3',
    sni: 'facebook.com',
    path: '/api/vless',
    type: 'ws',
    security: 'tls',
    color: '#00adef',
    ping: '~110ms'
  },
  {
    id: 4,
    name: 'Africell - WA Zero',
    operator: 'AFRICELL',
    flag: '🌐',
    location: 'Cloudflare Global',
    host: 'web.whatsapp.com',
    port: 443,
    uuid: 'ad6802e8-d698-4c6e-8121-50e588fbc8d3',
    sni: 'web.whatsapp.com',
    path: '/api/vless',
    type: 'ws',
    security: 'tls',
    color: '#00adef',
    ping: '~120ms'
  }
];

export const generateVLESSUri = (server) => {
  // Use the current window hostname if available, else fallback to server host
  const gateway = typeof window !== 'undefined' ? window.location.hostname : 'your-worker.workers.dev';
  
  const params = new URLSearchParams({
    encryption: 'none',
    security: server.security,
    sni: server.sni,
    type: server.type,
    host: server.sni, // Usually same as SNI for bug hosts
    path: server.path,
    fp: 'chrome' // Fingerprint for better stealth
  });
  
  const name = `${server.name}_${server.operator}_2026`;
  return `vless://${server.uuid}@${gateway}:${server.port}?${params.toString()}#${encodeURIComponent(name)}`;
};
