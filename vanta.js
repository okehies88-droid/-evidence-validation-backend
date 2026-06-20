export const VANTA_BASE_URL = process.env.VANTA_BASE_URL || 'https://api.vanta.com';

// NOTE: on Vercel's serverless runtime, this module-level cache only helps
// when a "warm" container happens to handle the next request — there's no
// guarantee of that the way there is on a long-running Express server. For
// light internal usage this is still a reasonable MVP (Vanta allows 5
// auth requests/minute), but if token requests start getting throttled,
// move this cache to Vercel KV or a similar external store.
let tokenCache = { token: null, expiresAt: 0 };

export async function getVantaToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 5000) {
    return tokenCache.token;
  }
  const res = await fetch(`${VANTA_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.VANTA_CLIENT_ID,
      client_secret: process.env.VANTA_CLIENT_SECRET,
      scope: process.env.VANTA_SCOPE || 'vanta-api.all:read',
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vanta token request failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return tokenCache.token;
}
