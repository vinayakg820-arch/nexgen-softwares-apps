// NexGen Softwares – server route for customers whose internet provider blocks *.supabase.co
// (some Jio / Airtel / ACT connections in India). The browser talks to
//   https://nexgensoftwares.edgeone.dev/sb/...   and this edge function forwards it to
//   https://nqqbduqqiwpaixmrweef.supabase.co/...
// Only used when the direct connection does not work (nexgen-app.js decides).
const UPSTREAM = 'https://nqqbduqqiwpaixmrweef.supabase.co';
const DROP_REQ = ['host', 'origin', 'referer', 'cookie', 'x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-for', 'x-real-ip',
  'eo-connecting-ip', 'eo-client-ip', 'cf-connecting-ip', 'accept-encoding', 'content-length'];
const DROP_RES = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie'];

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/sb(?=\/|$)/, '') || '/';
  if (!/^\/(rest|auth|storage|functions)\/v1\//.test(path)) return new Response('Not found', { status: 404 });

  const headers = new Headers(request.headers);
  DROP_REQ.forEach(h => headers.delete(h));
  headers.set('accept-encoding', 'identity');
  const method = request.method.toUpperCase();
  const init = { method, headers, redirect: 'manual' };
  if (method !== 'GET' && method !== 'HEAD') init.body = await request.arrayBuffer();

  let res;
  try { res = await fetch(UPSTREAM + path + url.search, init); }
  catch (e) { return new Response(JSON.stringify({ message: 'NexGen server route could not reach the database' }), { status: 502, headers: { 'content-type': 'application/json' } }); }

  const out = new Headers(res.headers);
  DROP_RES.forEach(h => out.delete(h));
  out.set('cache-control', 'no-store');
  out.set('x-nexgen-route', 'proxy');
  return new Response(method === 'HEAD' ? null : await res.arrayBuffer(), { status: res.status, statusText: res.statusText, headers: out });
}
