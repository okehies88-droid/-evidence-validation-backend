import { buildPrompt } from './_lib/prompt.js';
import { setCors } from './_lib/cors.js';

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { control, evidenceText } = req.body || {};
    if (!control || !evidenceText) {
      return res.status(400).json({ error: 'control and evidenceText are required' });
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1500,
        messages: [{ role: 'user', content: buildPrompt(control, evidenceText) }],
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data.error?.message || 'Anthropic API error' });
    }
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    if (!textBlock) throw new Error('No assessment content returned from the model.');
    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    let result;
    try {
      result = JSON.parse(cleaned);
    } catch (parseErr) {
      if (data.stop_reason === 'max_tokens') {
        throw new Error('Model response was cut off before completing (hit the token limit) — try raising max_tokens.');
      }
      throw new Error('Model did not return valid JSON: ' + parseErr.message);
    }
    res.status(200).json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
I'm providing clear copy-paste instructions to replace the entire file content on GitHub, using select-all to avoid the partial-paste issues from before. I'll also mention my secondary hypothesis about a potential Vercel timeout and what to check in the Vercel logs if the "Load failed" error persists after applying this fix.
Don
