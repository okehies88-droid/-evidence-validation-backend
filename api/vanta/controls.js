import { getVantaToken, VANTA_BASE_URL } from '../_lib/vanta.js';
import { setCors } from '../_lib/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const token = await getVantaToken();
    const r = await fetch(`${VANTA_BASE_URL}/v1/controls`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
