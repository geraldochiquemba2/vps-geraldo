export async function onRequest(context) {
  return new Response(JSON.stringify({
    status: 'online',
    version: '2.2.0',
    platform: 'Cloudflare Pages Functions (Git Architecture)',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
