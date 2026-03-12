/**
 * Utilitário para gerar configurações VLESS para Angola (Unitel/Africell)
 * Versão unificada: Site e Motor no mesmo domínio.
 */

export const OPERATORS = {
  UNITEL: {
    name: 'Unitel',
    bugHost: 'unitelmoney.ao',
    color: '#ff6600',
  },
  AFRICELL: {
    name: 'Africell',
    bugHost: 'facebook.com',
    color: '#00adef',
  }
};

export const generateVLESSUri = (operatorKey) => {
  const operator = OPERATORS[operatorKey];
  const uuid = 'ad6802e8-d698-4c6e-8121-50e588fbc8d3';
  
  // O Worker real que tem acesso ao cloudflare:sockets
  const address = 'ancient-butterfly-390a.staqw.workers.dev';
  const name = `Túnel_Angola_${operator.name}`;
  
  const params = new URLSearchParams({
    encryption: 'none',
    security: 'tls',
    sni: operator.bugHost,
    type: 'ws',
    host: address, // O host real do WebSocket é o domínio do site
    path: '/vless'  // O caminho definido na pasta functions/vless.js
  });

  return `vless://${uuid}@${address}:443?${params.toString()}#${encodeURIComponent(name)}`;
};

export const getDeepLink = (uri) => {
  return uri;
};
