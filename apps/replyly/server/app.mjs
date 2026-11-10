import {randomBytes, createHmac, timingSafeEqual} from 'node:crypto';
import {existsSync, createReadStream, statSync} from 'node:fs';
import {join, normalize, extname, resolve} from 'node:path';
import {
  hashPassword,
  verifyPassword,
  DUMMY_HASH,
  createSession,
  destroySession,
  readCookie,
  userFromRequest,
  sessionCookie,
  clearedCookie,
  createLoginLimiter,
} from './auth.mjs';
import {generateReply} from './reply.mjs';
import {seedSampleData} from './seed.mjs';

const MAX_BODY_BYTES = 100_000;
const CHANNELS = ['WhatsApp', 'Instagram'];
const STATUSES = ['New', 'Awaiting payment', 'Paid', 'Out for delivery', 'Delivered'];
const PAID_STATUSES = ['Paid', 'Out for delivery', 'Delivered'];
const DAY_MS = 86_400_000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ---------- validation ----------

function text(value, field, {min = 1, max = 200} = {}) {
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new HttpError(400, `${field} must be ${min} to ${max} characters`);
  }
  return trimmed;
}

function int(value, field, {min = 0, max = 100_000_000} = {}) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `${field} must be a whole number between ${min} and ${max}`);
  }
  return n;
}

function oneOf(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw new HttpError(400, `${field} must be one of: ${allowed.join(', ')}`);
  }
  return value;
}

function email(value) {
  const e = text(value, 'email', {max: 254}).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    throw new HttpError(400, 'Enter a valid email address');
  }
  return e;
}

// ---------- http helpers ----------

function readRaw(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseJson(raw) {
  if (raw.length === 0) {
    return {};
  }
  try {
    const value = JSON.parse(raw.toString());
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('not an object');
    }
    return value;
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

// ---------- row mappers ----------

const productOut = r => ({
  id: r.id,
  name: r.name,
  price: r.price,
  stock: r.stock,
  category: r.category,
  answeredByAi: r.ai_answers,
});

const orderOut = r => ({
  id: r.id,
  code: r.code,
  customer: r.customer,
  channel: r.channel,
  items: r.items,
  amount: r.amount,
  city: r.city,
  status: r.status,
  createdAt: r.created_at,
});

function loadConversation(db, userId, id) {
  const c = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(id, userId);
  if (!c) {
    return null;
  }
  const lines = db
    .prepare('SELECT id, sender, by_ai, text, created_at FROM messages WHERE conversation_id = ? AND user_id = ? ORDER BY id')
    .all(id, userId)
    .map(m => ({id: m.id, from: m.sender, byAi: m.by_ai === 1, text: m.text, createdAt: m.created_at}));
  const last = lines[lines.length - 1];
  return {
    id: c.id,
    customer: c.customer,
    channel: c.channel,
    needsHuman: c.needs_human === 1,
    unread: c.unread,
    preview: last?.text ?? '',
    updatedAt: c.updated_at,
    lines,
  };
}

// ---------- app ----------

export function createApp({db, config, staticDir}) {
  const limiter = createLoginLimiter();
  const now = () => new Date().toISOString();

  const startSession = (res, user, status, body) => {
    const {token, maxAgeSeconds} = createSession(db, user.id);
    send(res, status, body, {
      'set-cookie': sessionCookie(token, maxAgeSeconds, config.cookieSecure),
    });
  };

  const routes = [];
  const route = (method, path, auth, handler) =>
    routes.push({method, regex: new RegExp(`^${path.replace(/:(\w+)/g, '(?<$1>\\d+)')}$`), auth, handler});

  // --- public
  route('GET', '/api/status', false, async ({res}) =>
    send(res, 200, {ai: Boolean(config.anthropicApiKey), payments: Boolean(config.paystackSecretKey)}),
  );

  route('POST', '/api/auth/signup', false, async ({res, body}) => {
    const userEmail = email(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    if (password.length < 8 || password.length > 200) {
      throw new HttpError(400, 'Password must be 8 to 200 characters');
    }
    const businessName = text(body.businessName, 'businessName', {max: 80});
    const name = body.name === undefined ? '' : text(body.name, 'name', {max: 80});
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(userEmail)) {
      throw new HttpError(409, 'An account with this email already exists');
    }
    const {id} = db
      .prepare(
        'INSERT INTO users (email, name, business_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id',
      )
      .get(userEmail, name, businessName, await hashPassword(password), now());
    startSession(res, {id}, 201, {user: {id, email: userEmail, name, businessName}});
  });

  route('POST', '/api/auth/login', false, async ({req, res, body}) => {
    const userEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const key = `${req.socket.remoteAddress ?? 'unknown'}|${userEmail}`;
    if (limiter.isBlocked(key)) {
      throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');
    }
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(userEmail);
    const ok = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
    if (!row || !ok) {
      limiter.recordFailure(key);
      throw new HttpError(401, 'Incorrect email or password');
    }
    limiter.reset(key);
    startSession(res, row, 200, {
      user: {id: row.id, email: row.email, name: row.name, businessName: row.business_name},
    });
  });

  route('POST', '/api/auth/logout', false, async ({req, res}) => {
    const token = readCookie(req);
    if (token) {
      destroySession(db, token);
    }
    send(res, 200, {ok: true}, {'set-cookie': clearedCookie(config.cookieSecure)});
  });

  route('GET', '/api/auth/me', false, async ({res, user}) => {
    if (!user) {
      throw new HttpError(401, 'Not signed in');
    }
    send(res, 200, {user});
  });

  // Paystack calls this; it is authenticated by an HMAC signature instead of a cookie.
  route('POST', '/api/paystack/webhook', false, async ({req, res, raw}) => {
    if (!config.paystackSecretKey) {
      throw new HttpError(503, 'Payments are not configured');
    }
    const given = String(req.headers['x-paystack-signature'] ?? '');
    const expected = createHmac('sha512', config.paystackSecretKey).update(raw).digest('hex');
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new HttpError(401, 'Invalid signature');
    }
    const event = parseJson(raw);
    if (event.event === 'charge.success' && event.data?.reference) {
      const order = db.prepare('SELECT * FROM orders WHERE payment_reference = ?').get(String(event.data.reference));
      if (
        order &&
        event.data.currency === 'NGN' &&
        event.data.amount === order.amount * 100 &&
        (order.status === 'New' || order.status === 'Awaiting payment')
      ) {
        db.prepare("UPDATE orders SET status = 'Paid' WHERE id = ?").run(order.id);
      }
    }
    send(res, 200, {received: true});
  });

  // --- authenticated: products
  route('GET', '/api/products', true, async ({res, user}) =>
    send(res, 200, {
      products: db.prepare('SELECT * FROM products WHERE user_id = ? ORDER BY id').all(user.id).map(productOut),
    }),
  );

  route('POST', '/api/products', true, async ({res, user, body}) => {
    const row = db
      .prepare(
        'INSERT INTO products (user_id, name, price, stock, category) VALUES (?, ?, ?, ?, ?) RETURNING *',
      )
      .get(
        user.id,
        text(body.name, 'name', {max: 120}),
        int(body.price, 'price', {min: 1}),
        int(body.stock, 'stock', {max: 1_000_000}),
        body.category === undefined || body.category === '' ? '' : text(body.category, 'category', {max: 60}),
      );
    send(res, 201, {product: productOut(row)});
  });

  route('PATCH', '/api/products/:id', true, async ({res, user, body, params}) => {
    const existing = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(params.id, user.id);
    if (!existing) {
      throw new HttpError(404, 'Product not found');
    }
    const row = db
      .prepare('UPDATE products SET name = ?, price = ?, stock = ?, category = ? WHERE id = ? AND user_id = ? RETURNING *')
      .get(
        body.name === undefined ? existing.name : text(body.name, 'name', {max: 120}),
        body.price === undefined ? existing.price : int(body.price, 'price', {min: 1}),
        body.stock === undefined ? existing.stock : int(body.stock, 'stock', {max: 1_000_000}),
        body.category === undefined ? existing.category : text(body.category, 'category', {min: 0, max: 60}),
        params.id,
        user.id,
      );
    send(res, 200, {product: productOut(row)});
  });

  route('DELETE', '/api/products/:id', true, async ({res, user, params}) => {
    const result = db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(params.id, user.id);
    if (result.changes === 0) {
      throw new HttpError(404, 'Product not found');
    }
    send(res, 200, {ok: true});
  });

  // --- authenticated: orders
  route('GET', '/api/orders', true, async ({res, user}) =>
    send(res, 200, {
      orders: db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(user.id).map(orderOut),
    }),
  );

  route('POST', '/api/orders', true, async ({res, user, body}) => {
    const count = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE user_id = ?').get(user.id).n;
    const row = db
      .prepare(
        `INSERT INTO orders (user_id, code, customer, channel, items, amount, city, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'New', ?) RETURNING *`,
      )
      .get(
        user.id,
        `RPL-${1001 + count}`,
        text(body.customer, 'customer', {max: 80}),
        oneOf(body.channel, 'channel', CHANNELS),
        text(body.items, 'items', {max: 300}),
        int(body.amount, 'amount', {min: 1}),
        body.city === undefined ? '' : text(body.city, 'city', {min: 0, max: 80}),
        now(),
      );
    send(res, 201, {order: orderOut(row)});
  });

  route('PATCH', '/api/orders/:id', true, async ({res, user, body, params}) => {
    const status = oneOf(body.status, 'status', STATUSES);
    const row = db
      .prepare('UPDATE orders SET status = ? WHERE id = ? AND user_id = ? RETURNING *')
      .get(status, params.id, user.id);
    if (!row) {
      throw new HttpError(404, 'Order not found');
    }
    send(res, 200, {order: orderOut(row)});
  });

  // --- authenticated: payment links (amount always comes from the database)
  route('POST', '/api/payment-link', true, async ({res, user, body}) => {
    const order = db
      .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
      .get(int(body.orderId, 'orderId', {min: 1}), user.id);
    if (!order) {
      throw new HttpError(404, 'Order not found');
    }
    if (PAID_STATUSES.includes(order.status)) {
      throw new HttpError(409, 'This order is already paid');
    }
    const customerEmail = email(body.email);
    const reference = `${order.code}-${randomBytes(4).toString('hex')}`;

    if (!config.paystackSecretKey) {
      return send(res, 200, {url: null, reference, source: 'demo'});
    }
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {authorization: `Bearer ${config.paystackSecretKey}`, 'content-type': 'application/json'},
      body: JSON.stringify({email: customerEmail, amount: order.amount * 100, reference, currency: 'NGN'}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.status) {
      throw new HttpError(502, data.message ?? `Paystack error ${response.status}`);
    }
    db.prepare(
      "UPDATE orders SET payment_reference = ?, status = CASE WHEN status = 'New' THEN 'Awaiting payment' ELSE status END WHERE id = ? AND user_id = ?",
    ).run(reference, order.id, user.id);
    send(res, 200, {url: data.data.authorization_url, reference, source: 'paystack'});
  });

  // --- authenticated: conversations
  route('GET', '/api/conversations', true, async ({res, user}) => {
    const ids = db
      .prepare('SELECT id FROM conversations WHERE user_id = ? ORDER BY updated_at DESC')
      .all(user.id)
      .map(r => r.id);
    send(res, 200, {conversations: ids.map(id => loadConversation(db, user.id, id))});
  });

  route('PATCH', '/api/conversations/:id', true, async ({res, user, body, params}) => {
    const needsHuman = typeof body.needsHuman === 'boolean' ? (body.needsHuman ? 1 : 0) : null;
    if (needsHuman === null) {
      throw new HttpError(400, 'needsHuman must be true or false');
    }
    const result = db
      .prepare('UPDATE conversations SET needs_human = ?, unread = 0 WHERE id = ? AND user_id = ?')
      .run(needsHuman, params.id, user.id);
    if (result.changes === 0) {
      throw new HttpError(404, 'Conversation not found');
    }
    send(res, 200, {conversation: loadConversation(db, user.id, params.id)});
  });

  // Simulates an incoming customer message and stores the AI reply.
  route('POST', '/api/conversations/:id/test-message', true, async ({res, user, body, params}) => {
    const conversation = loadConversation(db, user.id, params.id);
    if (!conversation) {
      throw new HttpError(404, 'Conversation not found');
    }
    const message = text(body.text, 'text', {max: 1000});
    const addMessage = db.prepare(
      'INSERT INTO messages (conversation_id, user_id, sender, by_ai, text, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    );
    addMessage.run(conversation.id, user.id, 'customer', 0, message, now());

    const history = [...conversation.lines, {from: 'customer', text: message}].map(l => ({from: l.from, text: l.text}));
    const catalogue = db.prepare('SELECT * FROM products WHERE user_id = ?').all(user.id);
    const result = await generateReply(config, history, catalogue, user.businessName);

    addMessage.run(conversation.id, user.id, 'business', 1, result.reply, now());
    db.prepare(
      'UPDATE conversations SET needs_human = ?, unread = 0, updated_at = ? WHERE id = ? AND user_id = ?',
    ).run(result.needsHuman ? 1 : conversation.needsHuman ? 1 : 0, now(), conversation.id, user.id);
    const lowered = result.reply.toLowerCase();
    for (const p of catalogue) {
      if (lowered.includes(p.name.toLowerCase())) {
        db.prepare('UPDATE products SET ai_answers = ai_answers + 1 WHERE id = ? AND user_id = ?').run(p.id, user.id);
      }
    }
    send(res, 200, {conversation: loadConversation(db, user.id, conversation.id), source: result.source});
  });

  // --- authenticated: stats and sample data
  route('GET', '/api/stats', true, async ({res, user}) => {
    const t = Date.now();
    const since = ms => new Date(t - ms).toISOString();
    const week = (from, to) => {
      const orders = db
        .prepare('SELECT amount, status FROM orders WHERE user_id = ? AND created_at >= ? AND created_at < ?')
        .all(user.id, from, to);
      const aiMessages = db
        .prepare(
          'SELECT COUNT(*) AS n FROM messages WHERE user_id = ? AND by_ai = 1 AND created_at >= ? AND created_at < ?',
        )
        .get(user.id, from, to).n;
      return {
        orders: orders.length,
        revenue: orders.filter(o => PAID_STATUSES.includes(o.status)).reduce((s, o) => s + o.amount, 0),
        aiMessages,
      };
    };
    const thisWeek = week(since(7 * DAY_MS), new Date(t + DAY_MS).toISOString());
    const lastWeek = week(since(14 * DAY_MS), since(7 * DAY_MS));

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date(t - i * DAY_MS);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + DAY_MS);
      const count = table =>
        db
          .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ? AND created_at >= ? AND created_at < ?`)
          .get(user.id, start.toISOString(), end.toISOString()).n;
      days.push({
        day: start.toLocaleDateString('en-NG', {weekday: 'short', timeZone: 'UTC'}),
        messages: count('messages'),
        orders: count('orders'),
      });
    }
    const needsYou = db
      .prepare('SELECT COUNT(*) AS n FROM conversations WHERE user_id = ? AND needs_human = 1')
      .get(user.id).n;
    send(res, 200, {thisWeek, lastWeek, weekly: days, needsYou});
  });

  route('POST', '/api/seed', true, async ({res, user}) => {
    const has = ['products', 'orders', 'conversations'].some(
      table => db.prepare(`SELECT 1 FROM ${table} WHERE user_id = ? LIMIT 1`).get(user.id),
    );
    if (has) {
      throw new HttpError(409, 'Your account already has data');
    }
    seedSampleData(db, user.id);
    send(res, 201, {ok: true});
  });

  // --- static frontend (production build) with SPA fallback
  const serveStatic = (req, res) => {
    if (!staticDir || !existsSync(staticDir)) {
      return send(res, 404, {error: 'Not found'});
    }
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = resolve(join(staticDir, normalize(urlPath)));
    if (!file.startsWith(resolve(staticDir))) {
      return send(res, 403, {error: 'Forbidden'});
    }
    if (!existsSync(file) || statSync(file).isDirectory()) {
      file = join(staticDir, 'index.html');
    }
    res.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff',
    });
    createReadStream(file).pipe(res);
  };

  return async function handle(req, res) {
    const path = (req.url ?? '/').split('?')[0];
    if (!path.startsWith('/api/')) {
      return serveStatic(req, res);
    }
    try {
      const match = routes
        .map(r => ({r, m: r.method === req.method ? r.regex.exec(path) : null}))
        .find(x => x.m);
      if (!match) {
        throw new HttpError(404, 'Not found');
      }
      const {r, m} = match;
      const params = m.groups ? Object.fromEntries(Object.entries(m.groups).map(([k, v]) => [k, Number(v)])) : {};
      const user = userFromRequest(db, req);
      if (r.auth && !user) {
        throw new HttpError(401, 'Not signed in');
      }
      let raw = Buffer.alloc(0);
      let body = {};
      if (req.method !== 'GET') {
        raw = await readRaw(req);
        if (path !== '/api/paystack/webhook' && raw.length > 0) {
          // Requiring JSON blocks cross-site form posts (no CORS preflight is ever granted).
          if (!String(req.headers['content-type'] ?? '').includes('application/json')) {
            throw new HttpError(415, 'Content-Type must be application/json');
          }
          body = parseJson(raw);
        }
      }
      await r.handler({req, res, user, body, raw, params});
    } catch (error) {
      if (!(error instanceof HttpError)) {
        console.error(error);
      }
      send(res, error.status ?? 500, {error: error.status ? error.message : 'Server error'});
    }
  };
}
