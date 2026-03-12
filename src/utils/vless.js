/**
 * Utilitário para gerar configurações VLESS para Angola (Unitel/Africell)
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

// Configurações do seu servidor (VPS ou Cloudflare Worker)
// No futuro, isso pode ser buscado de um admin/backend
const SERVER_CONFIG = {
  address: 'vps-angola.seunome.workers.dev', // O seu domínio do Worker ou IP da VPS
  port: 443,
  path: '/vless-query',
  proxyIP: '8.212.181.166'
};

export const generateVLESSUri = (operatorKey) => {
  const operator = OPERATORS[operatorKey];
  const uuid = crypto.randomUUID();
  const name = `Túnel_Grátis_${operator.name}`;
  
  // vless://uuid@host:port?encryption=none&security=tls&sni=sni&type=ws&host=sni&path=path#name
  const params = new URLSearchParams({
    encryption: 'none',
    security: 'tls',
    sni: operator.bugHost,
    type: 'ws',
    host: operator.bugHost,
    path: SERVER_CONFIG.path
  });

  return `vless://${uuid}@${SERVER_CONFIG.address}:${SERVER_CONFIG.port}?${params.toString()}#${encodeURIComponent(name)}`;
};

export const getDeepLink = (uri) => {
  // A maioria das apps (NapsternetV, v2rayNG) registra o esquema vless://
  return uri;
};
