import { setCors } from './_lib/cors.js';

export default function handler(req, res) {
  setCors(res);
  res.status(200).json({ ok: true });
}
