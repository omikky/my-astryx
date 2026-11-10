const naira = n => `₦${Number(n).toLocaleString('en-NG')}`;

export function rulesReply(messages, catalogue) {
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
    return {reply: `${product.name} is ${naira(product.price)}. ${stock}`, needsHuman: false};
  }
  return {
    reply: 'Hello! Welcome. Tell me what you are looking for and I will help you with the price and availability.',
    needsHuman: false,
  };
}

async function claudeReply({apiKey, model}, messages, catalogue, business) {
  const catalogueText = catalogue
    .map(p => `- ${p.name}: ${naira(p.price)}, ${p.stock === 0 ? 'OUT OF STOCK' : `${p.stock} in stock`}`)
    .join('\n');
  const system = [
    `You are the sales assistant for ${business}, a small Nigerian business, replying to customers on WhatsApp or Instagram.`,
    'Write short, warm, natural replies in simple Nigerian English. Quote prices in naira exactly as listed.',
    'Only sell what is in the catalogue. Never invent products, prices, stock or delivery promises.',
    'Delivery: Lagos ₦2,500 within 24 hours; Abuja ₦4,500 in 2 to 3 days.',
    'If the customer asks for a discount, haggles, complains, asks for a refund, or you are unsure, start your reply with [HUMAN] and say the owner will follow up.',
    `Catalogue:\n${catalogueText || '(empty)'}`,
  ].join('\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
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
  return {reply: raw.replace(/^\[HUMAN\]\s*/, ''), needsHuman: raw.startsWith('[HUMAN]')};
}

export async function generateReply(config, messages, catalogue, business) {
  if (config.anthropicApiKey) {
    try {
      const result = await claudeReply(
        {apiKey: config.anthropicApiKey, model: config.anthropicModel},
        messages,
        catalogue,
        business,
      );
      return {...result, source: 'claude'};
    } catch (error) {
      console.error('Claude call failed, using rules:', error.message);
    }
  }
  return {...rulesReply(messages, catalogue), source: 'rules'};
}
