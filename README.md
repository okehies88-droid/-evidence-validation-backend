# Evidence validation backend — Vercel version

Same logic as the Express version, restructured into Vercel's serverless
function format (`api/` directory, each file exports a default
`(req, res)` handler — that's Vercel's convention, not a custom choice).

## What's different from the Express version

- No `app.listen()` — Vercel runs each file in `api/` as its own function
- No `express`/`cors` packages needed — `req.body` is parsed for you, and
  CORS headers are set manually in `api/_lib/cors.js`
- Shared code (`prompt.js`, `vanta.js`, `cors.js`) lives under `api/_lib/` —
  the underscore prefix tells Vercel "don't treat this as a route"
- The Vanta token cache is best-effort only (see the comment in
  `api/_lib/vanta.js`) — serverless containers aren't guaranteed to stay
  warm between requests the way a long-running server is

## What I verified vs. what you still need to verify

I don't have a Vercel account to deploy this from, and I don't have your
Vanta credentials or an Anthropic API key in this environment — so I
couldn't run a real, live deployment. What I *did* verify: `test-handlers.mjs`
calls each handler directly with mocked Vanta/Anthropic responses and checks
the request parsing, error handling, and response shaping are all correct.
Run it yourself before deploying:

```bash
node test-handlers.mjs
```

All 6 checks should print `PASS`. This proves the code logic is sound — it
does *not* prove Vanta's or Anthropic's real APIs behave exactly like the
mocks. The first real test is step 5 below.

## Deploying for real

```bash
npm install -g vercel
vercel login
```

From inside this folder:

```bash
vercel
```

This links the folder to a new Vercel project and does a preview deploy.
You'll be prompted for a few defaults — accepting them is fine for this
project (no special build settings needed).

**Set your real secrets** — either in the Vercel dashboard
(Project → Settings → Environment Variables) or via the CLI:

```bash
vercel env add ANTHROPIC_API_KEY
vercel env add VANTA_CLIENT_ID
vercel env add VANTA_CLIENT_SECRET
```

Then deploy to production:

```bash
vercel --prod
```

You'll get a real URL back, something like
`https://evidence-validation-backend.vercel.app`.

## Testing the live deployment

Start with the endpoint that doesn't need any external service:

```bash
curl https://YOUR-DEPLOYMENT-URL/api/health
# expect: {"ok":true}
```

Then test the AI assessment endpoint — this only needs your Anthropic key,
not Vanta, so you can verify it before Vanta access comes through:

```bash
curl -X POST https://YOUR-DEPLOYMENT-URL/api/assess \
  -H "Content-Type: application/json" \
  -d '{
    "control": {
      "id": "AC-01",
      "framework": "SOC 2",
      "requirement": "Quarterly access review",
      "criteria": "A dated review report naming the reviewer and systems reviewed."
    },
    "evidenceText": "Q1 2026 access review conducted by Jane Doe on 2026-04-02. Reviewed AWS production admin access, 14 users confirmed active."
  }'
```

You should get back real JSON from Claude — `status`, `confidence`,
`reasoning`, etc. If that works, the harder-to-test piece (the Anthropic
call) is confirmed live.

Finally, once you have real Vanta credentials:

```bash
curl https://YOUR-DEPLOYMENT-URL/api/vanta/controls
```

If this 401s or 403s, it's almost always a scope problem — double check the
OAuth app was created with `vanta-api.all:read` and that the client
id/secret in Vercel's env vars match exactly.

## Connecting the frontend

The HTML demo from earlier calls `api.anthropic.com` directly, which only
works inside a Claude.ai artifact. For this hosted version, swap that one
`fetch` call in `runAssessment()` to point at your new endpoint instead:

```js
const response = await fetch('https://YOUR-DEPLOYMENT-URL/api/assess', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ control, evidenceText }),
});
const result = await response.json();
```

That's the only change needed to point the existing UI at this backend —
happy to make that edit and host the frontend on Vercel too (static sites
deploy the same way) once you want to wire it all together.
