import assert from 'node:assert/strict';

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    end() { return this; },
  };
}

let fetchCalls = [];
const originalFetch = global.fetch;

function mockFetch(responses) {
  fetchCalls = [];
  global.fetch = async (url, opts) => {
    fetchCalls.push({ url: url.toString(), opts });
    const match = responses.find((r) => url.toString().includes(r.match));
    if (!match) throw new Error('Unmocked fetch: ' + url);
    return {
      ok: match.ok !== false,
      status: match.status || 200,
      json: async () => match.json,
      text: async () => JSON.stringify(match.json),
    };
  };
}

function restoreFetch() {
  global.fetch = originalFetch;
}

// health.js
{
  const { default: handler } = await import('./api/health.js');
  const res = mockRes();
  handler({}, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  console.log('PASS  health.js returns 200 ok');
}

// assess.js: missing fields -> 400
{
  const { default: handler } = await import('./api/assess.js');
  const res = mockRes();
  await handler({ method: 'POST', body: {} }, res);
  assert.equal(res.statusCode, 400);
  console.log('PASS  assess.js rejects missing control/evidenceText with 400');
}

// assess.js: happy path
{
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  const { default: handler } = await import('./api/assess.js');
  mockFetch([
    {
      match: 'api.anthropic.com',
      ok: true,
      json: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'Partial',
              confidence: 'Medium',
              reasoning: 'Test reasoning.',
              evidence_citations: ['some quote'],
              gaps: ['missing X'],
              reviewer_focus: 'check Y',
            }),
          },
        ],
      },
    },
  ]);
  const res = mockRes();
  await handler(
    {
      method: 'POST',
      body: { control: { id: 'AC-01', framework: 'SOC 2', requirement: 'req', criteria: 'crit' }, evidenceText: 'some evidence' },
    },
    res
  );
  restoreFetch();
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'Partial');
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].opts.headers['x-api-key'], 'test-anthropic-key');
  console.log('PASS  assess.js happy path: correct parse, exactly 1 outbound call, x-api-key header present');
}

// assess.js: propagates Anthropic API errors
{
  const { default: handler } = await import('./api/assess.js');
  mockFetch([{ match: 'api.anthropic.com', ok: false, status: 401, json: { error: { message: 'invalid x-api-key' } } }]);
  const res = mockRes();
  await handler(
    { method: 'POST', body: { control: { id: 'AC-01', framework: 'SOC 2', requirement: 'req', criteria: 'crit' }, evidenceText: 'evidence' } },
    res
  );
  restoreFetch();
  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /invalid x-api-key/);
  console.log('PASS  assess.js propagates Anthropic error status + message correctly');
}

// vanta/controls.js: token caching across calls
{
  process.env.VANTA_CLIENT_ID = 'test-id';
  process.env.VANTA_CLIENT_SECRET = 'test-secret';
  const { default: handler } = await import('./api/vanta/controls.js');
  mockFetch([
    { match: 'oauth/token', ok: true, json: { access_token: 'tok_abc', expires_in: 3600 } },
    { match: 'v1/controls', ok: true, json: { results: [{ id: 'AC-01' }] } },
  ]);
  const res1 = mockRes();
  await handler({ method: 'GET' }, res1);
  const res2 = mockRes();
  await handler({ method: 'GET' }, res2);
  restoreFetch();
  assert.equal(res1.statusCode, 200);
  assert.equal(res2.statusCode, 200);
  const tokenCalls = fetchCalls.filter((c) => c.url.includes('oauth/token'));
  assert.equal(tokenCalls.length, 1, 'token should be cached, not re-fetched on second request');
  console.log('PASS  vanta/controls.js: 2 requests produced only 1 token exchange (caching works)');
}

// vanta/documents.js: query param construction
{
  const { default: handler } = await import('./api/vanta/documents.js');
  mockFetch([{ match: 'v1/documents', ok: true, json: { results: [] } }]);
  const res = mockRes();
  await handler({ method: 'GET', query: { frameworkId: 'soc2' } }, res);
  restoreFetch();
  assert.equal(res.statusCode, 200);
  const docCall = fetchCalls.find((c) => c.url.includes('v1/documents'));
  assert.ok(docCall.url.includes('frameworkMatchesAny=soc2'), 'frameworkId should map to frameworkMatchesAny query param');
  console.log('PASS  vanta/documents.js builds the frameworkId filter correctly');
}

console.log('\nAll handler logic tests passed — these run with mocked Vanta/Anthropic responses.');
console.log('They prove the code is correct; they do not prove the live APIs behave identically.');
