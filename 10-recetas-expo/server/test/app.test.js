import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

let server;
let baseUrl;
let calls = [];
let responseStatus = 200;
let responseBody = { results: [], totalResults: 0 };

before(async () => {
  const app = createApp({
    apiKey: 'server-secret',
    fetchImpl: async (url) => {
      calls.push(new URL(url));
      return new Response(JSON.stringify(responseBody), {
        status: responseStatus,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('validates pagination before contacting Spoonacular', async () => {
  calls = [];
  const response = await fetch(`${baseUrl}/api/recipes?offset=-1`);
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});

test('paginates and returns an actual empty result page', async () => {
  calls = [];
  responseStatus = 200;
  responseBody = { results: [], totalResults: 0 };
  const response = await fetch(`${baseUrl}/api/recipes?query=soup&diet=vegan&offset=20&number=10`);
  const page = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(page, { results: [], totalResults: 0, offset: 20, number: 10 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].searchParams.get('apiKey'), 'server-secret');
  assert.equal(calls[0].searchParams.get('offset'), '20');
  assert.equal(calls[0].searchParams.get('number'), '10');
});

test('rejects malformed provider pages instead of returning empty results', async () => {
  responseStatus = 200;
  responseBody = { results: 'invalid', totalResults: 0 };
  const response = await fetch(`${baseUrl}/api/recipes?query=malformed`);
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.equal(body.code, 'INVALID_UPSTREAM_RESPONSE');

  responseBody = { results: [], totalResults: 0 };
});

test('uses short-lived server cache for repeated search pages', async () => {
  calls = [];
  const first = await fetch(`${baseUrl}/api/recipes?query=cache-test`);
  const second = await fetch(`${baseUrl}/api/recipes?query=cache-test`);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(calls.length, 1);
});

test('maps upstream quota responses to a distinct rate-limit response', async () => {
  responseStatus = 402;
  responseBody = { message: 'provider quota' };
  const response = await fetch(`${baseUrl}/api/recipes?query=limited`);
  const body = await response.json();
  assert.equal(response.status, 429);
  assert.equal(body.code, 'RATE_LIMITED');
  assert.equal(JSON.stringify(body).includes('server-secret'), false);

  responseStatus = 200;
  responseBody = { results: [], totalResults: 0 };
});

test('does not expose missing server API key or proxy arbitrary recipe ids', async () => {
  const missingKeyApp = createApp({ apiKey: '', fetchImpl: async () => assert.fail('must not fetch') });
  const missingKeyServer = missingKeyApp.listen(0);
  await new Promise((resolve) => missingKeyServer.once('listening', resolve));
  const missingKeyResponse = await fetch(`http://127.0.0.1:${missingKeyServer.address().port}/api/recipes`);
  assert.equal(missingKeyResponse.status, 503);
  await new Promise((resolve, reject) => missingKeyServer.close((error) => error ? reject(error) : resolve()));

  const invalidId = await fetch(`${baseUrl}/api/recipes/not-a-number`);
  assert.equal(invalidId.status, 400);
});
