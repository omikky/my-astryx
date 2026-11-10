import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHmac} from 'node:crypto';
import {openDb} from './db.mjs';
import {createApp} from './app.mjs';

let server;
let base;
let db;
const SECRET = 'sk_test_secret';

function start(config) {
  db = openDb(':memory:');
  const handler = createApp({db, config});
  server = createServer(handler);
  return new Promise(resolve =>
    server.listen(0, '127.0.0.1', () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    }),
  );
}

before(() => start({paystackSecretKey: SECRET, cookieSecure: false}));
after(() => server.close());

async function call(path, {method = 'GET', body, cookie, headers = {}, raw} = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? {'content-type': 'application/json'} : {}),
      ...(cookie ? {cookie} : {}),
      ...headers,
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const json = await response.json().catch(() => ({}));
  const setCookie = response.headers.get('set-cookie');
  return {status: response.status, json, setCookie, cookie: setCookie?.split(';')[0]};
}

async function signup(email, businessName = 'Test Shop') {
  const r = await call('/api/auth/signup', {
    method: 'POST',
    body: {email, password: 'correct horse battery', businessName},
  });
  assert.equal(r.status, 201);
  return r.cookie;
}

test('signup validates input and rejects duplicates', async () => {
  const bad = await call('/api/auth/signup', {method: 'POST', body: {email: 'nope', password: 'longenough1', businessName: 'X'}});
  assert.equal(bad.status, 400);
  const short = await call('/api/auth/signup', {method: 'POST', body: {email: 'a@b.co', password: 'short', businessName: 'X'}});
  assert.equal(short.status, 400);
  await signup('dup@example.com');
  const dup = await call('/api/auth/signup', {
    method: 'POST',
    body: {email: 'DUP@example.com', password: 'correct horse battery', businessName: 'X'},
  });
  assert.equal(dup.status, 409);
});

test('session cookie is HttpOnly, SameSite and identifies the user', async () => {
  const r = await call('/api/auth/signup', {
    method: 'POST',
    body: {email: 'cookie@example.com', password: 'correct horse battery', businessName: 'Cookie Co'},
  });
  assert.match(r.setCookie, /HttpOnly/);
  assert.match(r.setCookie, /SameSite=Lax/);
  const me = await call('/api/auth/me', {cookie: r.cookie});
  assert.equal(me.json.user.businessName, 'Cookie Co');
  assert.equal((await call('/api/auth/me')).status, 401);
});

test('passwords are stored hashed, never in plain text', async () => {
  const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('cookie@example.com');
  assert.ok(!row.password_hash.includes('correct horse battery'));
  assert.match(row.password_hash, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
});

test('login works, wrong password is rejected, logout kills the session', async () => {
  await signup('login@example.com');
  const wrong = await call('/api/auth/login', {method: 'POST', body: {email: 'login@example.com', password: 'wrong password'}});
  assert.equal(wrong.status, 401);
  const unknown = await call('/api/auth/login', {method: 'POST', body: {email: 'ghost@example.com', password: 'whatever123'}});
  assert.equal(unknown.status, 401);
  assert.equal(unknown.json.error, wrong.json.error);
  const ok = await call('/api/auth/login', {method: 'POST', body: {email: 'login@example.com', password: 'correct horse battery'}});
  assert.equal(ok.status, 200);
  assert.equal((await call('/api/auth/me', {cookie: ok.cookie})).status, 200);
  await call('/api/auth/logout', {method: 'POST', cookie: ok.cookie, body: {}});
  assert.equal((await call('/api/auth/me', {cookie: ok.cookie})).status, 401);
});

test('repeated failed logins are rate limited', async () => {
  let last;
  for (let i = 0; i < 9; i++) {
    last = await call('/api/auth/login', {method: 'POST', body: {email: 'limit@example.com', password: `wrong-${i}`}});
  }
  assert.equal(last.status, 429);
});

test('private routes require a session', async () => {
  for (const path of ['/api/products', '/api/orders', '/api/conversations', '/api/stats']) {
    assert.equal((await call(path)).status, 401, path);
  }
});

test('JSON content type is required for writes', async () => {
  const cookie = await signup('csrf@example.com');
  const r = await call('/api/products', {
    method: 'POST',
    cookie,
    raw: 'name=x&price=1&stock=1',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
  });
  assert.equal(r.status, 415);
});

test('each business only sees and changes its own data', async () => {
  const a = await signup('tenant-a@example.com');
  const b = await signup('tenant-b@example.com');
  const created = await call('/api/products', {method: 'POST', cookie: a, body: {name: 'Secret dress', price: 5000, stock: 3}});
  assert.equal(created.status, 201);
  const id = created.json.product.id;

  assert.equal((await call('/api/products', {cookie: b})).json.products.length, 0);
  assert.equal((await call(`/api/products/${id}`, {method: 'PATCH', cookie: b, body: {price: 1}})).status, 404);
  assert.equal((await call(`/api/products/${id}`, {method: 'DELETE', cookie: b})).status, 404);
  assert.equal((await call('/api/products', {cookie: a})).json.products[0].price, 5000);

  const order = await call('/api/orders', {
    method: 'POST', cookie: a,
    body: {customer: 'Ada', channel: 'WhatsApp', items: '1 × Secret dress', amount: 5000, city: 'Lagos'},
  });
  const orderId = order.json.order.id;
  assert.equal((await call(`/api/orders/${orderId}`, {method: 'PATCH', cookie: b, body: {status: 'Paid'}})).status, 404);
  assert.equal(
    (await call('/api/payment-link', {method: 'POST', cookie: b, body: {orderId, email: 'x@example.com'}})).status,
    404,
  );
});

test('input validation on products and orders', async () => {
  const cookie = await signup('valid@example.com');
  assert.equal((await call('/api/products', {method: 'POST', cookie, body: {name: 'X', price: -5, stock: 1}})).status, 400);
  assert.equal((await call('/api/products', {method: 'POST', cookie, body: {name: 'X', price: 10.5, stock: 1}})).status, 400);
  assert.equal(
    (await call('/api/orders', {method: 'POST', cookie, body: {customer: 'A', channel: 'Telegram', items: 'x', amount: 5}})).status,
    400,
  );
  assert.equal((await call('/api/orders/1', {method: 'PATCH', cookie, body: {status: 'Teleported'}})).status, 400);
});

test('sample data seeds once and fills stats', async () => {
  const cookie = await signup('seed@example.com');
  assert.equal((await call('/api/seed', {method: 'POST', cookie, body: {}})).status, 201);
  assert.equal((await call('/api/seed', {method: 'POST', cookie, body: {}})).status, 409);
  const stats = await call('/api/stats', {cookie});
  assert.equal(stats.json.weekly.length, 7);
  assert.ok(stats.json.thisWeek.orders > 0);
  assert.ok(stats.json.needsYou >= 1);
});

test('AI test message is stored, flags haggling, and is tenant-scoped', async () => {
  const a = await signup('chat-a@example.com');
  const b = await signup('chat-b@example.com');
  await call('/api/seed', {method: 'POST', cookie: a, body: {}});
  const conv = (await call('/api/conversations', {cookie: a})).json.conversations[0];

  const price = await call(`/api/conversations/${conv.id}/test-message`, {
    method: 'POST', cookie: a, body: {text: 'How much is the shea butter cream?'},
  });
  assert.equal(price.status, 200);
  const lines = price.json.conversation.lines;
  assert.match(lines[lines.length - 1].text, /₦9,000/);
  assert.equal(lines[lines.length - 1].byAi, true);

  const haggle = await call(`/api/conversations/${conv.id}/test-message`, {
    method: 'POST', cookie: a, body: {text: 'last price 5k abeg'},
  });
  assert.equal(haggle.json.conversation.needsHuman, true);

  const blocked = await call(`/api/conversations/${conv.id}/test-message`, {
    method: 'POST', cookie: b, body: {text: 'hello'},
  });
  assert.equal(blocked.status, 404);
});

test('payment link uses the stored order amount and refuses paid orders', async () => {
  const cookie = await signup('pay@example.com');
  const order = (await call('/api/orders', {
    method: 'POST', cookie,
    body: {customer: 'Ada', channel: 'WhatsApp', items: 'x', amount: 5000, city: 'Lagos'},
  })).json.order;
  // Client-supplied amounts are ignored: the request has no amount field at all.
  const bad = await call('/api/payment-link', {method: 'POST', cookie, body: {orderId: order.id, email: 'not-an-email'}});
  assert.equal(bad.status, 400);
  await call(`/api/orders/${order.id}`, {method: 'PATCH', cookie, body: {status: 'Paid'}});
  const paid = await call('/api/payment-link', {method: 'POST', cookie, body: {orderId: order.id, email: 'a@example.com'}});
  assert.equal(paid.status, 409);
});

test('Paystack webhook verifies the signature, amount and currency', async () => {
  const cookie = await signup('hook@example.com');
  const order = (await call('/api/orders', {
    method: 'POST', cookie,
    body: {customer: 'Ada', channel: 'WhatsApp', items: 'x', amount: 5000, city: 'Lagos'},
  })).json.order;
  db.prepare("UPDATE orders SET payment_reference = 'REF-1', status = 'Awaiting payment' WHERE id = ?").run(order.id);

  const sign = payload => createHmac('sha512', SECRET).update(payload).digest('hex');
  const post = (payload, signature) =>
    call('/api/paystack/webhook', {method: 'POST', raw: payload, headers: {'x-paystack-signature': signature}});
  const status = () => db.prepare('SELECT status FROM orders WHERE id = ?').get(order.id).status;

  const good = JSON.stringify({event: 'charge.success', data: {reference: 'REF-1', amount: 500000, currency: 'NGN'}});
  assert.equal((await post(good, 'deadbeef')).status, 401);
  assert.equal(status(), 'Awaiting payment');

  const underpaid = JSON.stringify({event: 'charge.success', data: {reference: 'REF-1', amount: 100, currency: 'NGN'}});
  assert.equal((await post(underpaid, sign(underpaid))).status, 200);
  assert.equal(status(), 'Awaiting payment');

  assert.equal((await post(good, sign(good))).status, 200);
  assert.equal(status(), 'Paid');
});
