/**
 * Splitstupid CORS proxy (Cloudflare Worker).
 *
 * A static site can't add CORS headers to third-party APIs, and shouldn't ship
 * secret keys in its bundle. This worker sits in between: the browser calls the
 * worker, the worker calls the upstream (injecting the secret key), and returns
 * the response with CORS headers for our own origins.
 *
 * Routes (path → upstream):
 *   GET  /ipstack            → https://api.ipstack.com/check?access_key=...
 *   POST /tabscan/process    → https://api.tabscanner.com/api/2/process
 *   GET  /tabscan/result/:id → https://api.tabscanner.com/api/result/:id
 *
 * Only these routes are forwarded — it is NOT an open proxy.
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim())
    const cors = corsHeaders(origin, allowed)

    // Preflight.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    try {
      const upstream = await route(url, request, env)
      if (!upstream) {
        return json({ error: 'Not found' }, 404, cors)
      }
      // Re-emit the upstream response with our CORS headers.
      const body = await upstream.arrayBuffer();
      const headers = new Headers(cors);
      headers.set(
        'Content-Type',
        upstream.headers.get('Content-Type') || 'application/json'
      )
      return new Response(body, { status: upstream.status, headers })
    } catch (err) {
      return json({ error: 'Proxy failed', detail: String(err) }, 502, cors)
    }
  },
}

async function route(url, request, env) {
  const { pathname } = url

  // ipstack geo-IP. Free plan is HTTP-only, so call it over HTTP server-side.
  // Pass ?ip=1.2.3.4 to look up a specific address (the caller's), since from
  // here ipstack would otherwise see the worker's IP. Omit it for "check".
  if (request.method === 'GET' && pathname === '/ipstack') {
    const ip = url.searchParams.get('ip')
    const target = new URL(`http://api.ipstack.com/${ip || 'check'}`)
    target.searchParams.set('access_key', env.IPSTACK_KEY)
    return fetch(target, { headers: { Accept: 'application/json' } })
  }

  // TabScanner: submit an image for processing.
  if (request.method === 'POST' && pathname === '/tabscan/process') {
    return fetch('https://api.tabscanner.com/api/2/process', {
      method: 'POST',
      headers: { apikey: env.TABSCANNER_KEY },
      body: request.body,
    })
  }

  // TabScanner: poll a result by token.
  const m = pathname.match(/^\/tabscan\/result\/([\w-]+)$/)
  if (request.method === 'GET' && m) {
    return fetch(`https://api.tabscanner.com/api/result/${m[1]}`, {
      headers: { apikey: env.TABSCANNER_KEY },
    })
  }

  return null
}

function corsHeaders(origin, allowed) {
  const ok = allowed.includes(origin)
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
