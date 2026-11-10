// Replyly API: AI replies (Claude) and payment links (Paystack).
// No dependencies. Secrets stay on the server and are read from the environment.
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';

const PORT = Number(process.env.PORT ?? 8787);
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-5-5';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const MAX_BODY_BYTES = 100_000;

const naira = n => `₦${Number(n).toLocaleString('en-NG')}`;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Body too large'), {status: 413}));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}'));
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), {status: 400}));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  res.writeHead(status, {'content-type': 'application/json'});
  res.end(JSON.stringify(body));
}

// ---------- AI replies ----------

function rulesReply(messages, catalogue) {
  const last = [...messages].reverse().find(m => m.from === 'customer');
  const text = (last?.text ?? '').toLowerCase();
  const product = catalogue.find(p =>
    p.name
      .toLowerCase()
      .split(' ')
      .filter(w => w.length > 3)
      .some(w => text.includes(w)),
  );

  if (/(discount|reduce|last price|\bk\b|₦\s?\d+\s?k|cheaper|refund|complain|fake|scam)/.test(text)) {
    return {
      reply: 'Let me get the owner to look at this and come back to you shortly.',
      needsHuman: true,
    };
  }
  if (/(account|pay|transfer|payment)/.test(text)) {
    return {
      reply: 'Sure! I will send your payment link now. Once it is paid, your order is confirmed automatically.',
      needsHuman: false,
    };
  }
  if (/(deliver|shipping|dispatch)/.test(text)) {
    return {
      reply: 'We deliver within Lagos in 24 hours for ₦2,500, and to Abuja in 2 to 3 days for ₦4,500.',
      needsHuman: false,
    };
  }
  if (product) {
    const stock =
      product.stock === 0
        ? 'It is out of stock right now, but I can notify you when it is back.'
        : `We have ${product.stock} in stock.`;
    return {
      reply: `${product.name} is ${naira(product.price)}. ${stock}`,
      needsHuman: false,
    };
  }
  return {
    reply: 'Hello! Welcome. Tell me what you are looking for and I will help you with the price and availability.',
    needsHuman: false,
  };
}

async function claudeReply(messages, catalogue, business) {
  const catalogueText = catalogue
    .map(p => `- ${p.name}: ${naira(p.price)}, ${p.stock === 0 ? 'OUT OF STOCK' : `${p.stock} in stock`}`)
    .join('\n');
  const system = [
    `You are the sales assistant for ${business}, a small Nigerian business, replying to customers on WhatsApp or Instagram.`,
    'Write short, warm, natural replies in simple Nigerian English. Quote prices in naira exactly as listed.',
    'Only sell what is in the catalogue. Never invent products, prices, stock or delivery promises.',
    'Delivery: Lagos ₦2,500 within 24 hours; Abuja ₦4,500 in 2 to 3 days.',
    'If the customer asks for a discount, haggles, complains, asks for a refund, or you are unsure, start your reply with [HUMAN] and say the owner will follow up.',
    `Catalogue:\n${catalogueText}`,
  ].join('\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      system,
      messages: messages.slice(-12).map(m => ({
        role: m.from === 'customer' ? 'user' : 'assistant',
        content: String(m.text).slice(0, 1000),
      })),
    }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic API ${response.status}`);
  }
  const data = await response.json();
  const raw = (data.content ?? []).map(b => b.text ?? '').join('').trim();
  const needsHuman = raw.startsWith('[HUMAN]');
  return {reply: raw.replace(/^\[HUMAN\]\s*/, ''), needsHuman};
}

async function handleReply(req, res) {
  const {messages, catalogue, business} = await readJson(req);
  if (!Array.isArray(messages) || !Array.isArray(catalogue)) {
    return send(res, 400, {error: 'messages and catalogue are required arrays'});
  }
  const name = String(business ?? 'this shop').slice(0, 80);
  if (ANTHROPIC_API_KEY) {
    try {
      return send(res, 200, {...(await claudeReply(messages, catalogue, name)), source: 'claude'});
    } catch (error) {
      console.error('Claude call failed, using rules:', error.message);
    }
  }
  return send(res, 200, {...rulesReply(messages, catalogue), source: 'rules'});
}

// ---------- Payments ----------

async function handlePaymentLink(req, res) {
  const {amount, email, orderId} = await readJson(req);
  const naira_ = Number(amount);
  if (!Number.isFinite(naira_) || naira_ < 100) {
    return send(res, 400, {error: 'amount must be at least ₦100'});
  }
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    return send(res, 400, {error: 'a valid customer email is required'});
  }
  const reference = `${String(orderId ?? 'RPL').replace(/[^\w-]/g, '').slice(0, 20)}-${randomBytes(4).toString('hex')}`;

  if (!PAYSTACK_SECRET_KEY) {
    return send(res, 200, {url: null, reference, source: 'demo'});
  }
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({email, amount: Math.round(naira_ * 100), reference, currency: 'NGN'}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.status) {
    return send(res, 502, {error: data.message ?? `Paystack error ${response.status}`});
  }
  return send(res, 200, {url: data.data.authorization_url, reference, source: 'paystack'});
}

// ---------- Server ----------

const routes = {
  'POST /api/reply': handleReply,
  'POST /api/payment-link': handlePaymentLink,
  'GET /api/status': async (_req, res) =>
    send(res, 200, {ai: Boolean(ANTHROPIC_API_KEY), payments: Boolean(PAYSTACK_SECRET_KEY)}),
};

createServer(async (req, res) => {
  const handler = routes[`${req.method} ${req.url?.split('?')[0]}`];
  if (!handler) {
    return send(res, 404, {error: 'Not found'});
  }
  try {
    await handler(req, res);
  } catch (error) {
    send(res, error.status ?? 500, {error: error.message ?? 'Server error'});
  }
}).listen(PORT, () => {
  console.log(
    `Replyly API on :${PORT} (AI: ${ANTHROPIC_API_KEY ? 'Claude' : 'rules fallback'}, payments: ${PAYSTACK_SECRET_KEY ? 'Paystack' : 'demo'})`,
  );
});
