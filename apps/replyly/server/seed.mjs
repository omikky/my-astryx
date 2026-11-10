const minutesAgo = m => new Date(Date.now() - m * 60_000).toISOString();
const daysAgo = d => new Date(Date.now() - d * 86_400_000).toISOString();

const PRODUCTS = [
  ['Ankara wrap dress', 28000, 14, 'Fashion', 112],
  ['Leather slides', 18500, 31, 'Footwear', 87],
  ['Shea butter body cream', 9000, 56, 'Beauty', 143],
  ['Gele and aso-oke set', 85000, 4, 'Fashion', 39],
  ['Beaded clutch bag', 17000, 0, 'Accessories', 64],
  ['Adire face towel set', 12000, 22, 'Home', 21],
];

const ORDERS = [
  ['Chioma Okafor', 'WhatsApp', '2 × Ankara wrap dress', 56000, 'Lekki, Lagos', 'Awaiting payment', 0],
  ['Tunde Bakare', 'Instagram', '1 × Leather slides (size 43)', 18500, 'Ikeja, Lagos', 'Paid', 0],
  ['Amina Yusuf', 'WhatsApp', '3 × Shea butter body cream', 27000, 'Wuse 2, Abuja', 'Out for delivery', 1],
  ['Emeka Nwosu', 'Instagram', '1 × Gele and aso-oke set', 85000, 'Garki, Abuja', 'New', 0],
  ['Ngozi Eze', 'WhatsApp', '2 × Beaded clutch bag', 34000, 'Yaba, Lagos', 'Delivered', 2],
  ['Bola Adeyemi', 'WhatsApp', '1 × Ankara wrap dress', 28000, 'Surulere, Lagos', 'Delivered', 3],
  ['Sadiq Garba', 'Instagram', '2 × Leather slides (size 44)', 37000, 'Maitama, Abuja', 'Paid', 4],
  ['Funke Alabi', 'WhatsApp', '1 × Shea butter body cream', 9000, 'Ajah, Lagos', 'Awaiting payment', 5],
];

const CONVERSATIONS = [
  {
    customer: 'Chioma Okafor', channel: 'WhatsApp', needsHuman: 0, unread: 1,
    lines: [
      ['customer', 0, 'Hi, do you still have the Ankara wrap dress in size 12?', 14],
      ['business', 1, 'Good morning Chioma! Yes, size 12 is available at ₦28,000. We deliver in Lagos within 24 hours.', 14],
      ['customer', 0, 'Nice. I want two. Delivery to Lekki phase 1 how much?', 12],
      ['business', 1, 'Two dresses is ₦56,000. Delivery to Lekki Phase 1 is ₦2,500. Total: ₦58,500. Should I generate your payment link?', 12],
      ['customer', 0, 'Please send your account details', 10],
    ],
  },
  {
    customer: 'Emeka Nwosu', channel: 'Instagram', needsHuman: 1, unread: 2,
    lines: [
      ['customer', 0, 'How much for the gele and aso-oke set?', 90],
      ['business', 1, 'The full set is ₦85,000. It comes with the gele, aso-oke and a matching fan.', 90],
      ['customer', 0, 'Can you do ₦70k for the aso-oke set?', 85],
    ],
  },
  {
    customer: 'Amina Yusuf', channel: 'WhatsApp', needsHuman: 0, unread: 0,
    lines: [
      ['business', 1, 'Your order is out for delivery to Wuse 2. Rider: Musa.', 300],
      ['customer', 0, 'Thank you, I have received it', 60],
    ],
  },
  {
    customer: 'Tunde Bakare', channel: 'Instagram', needsHuman: 0, unread: 1,
    lines: [['customer', 0, 'Payment sent, abeg confirm', 20]],
  },
];

export function seedSampleData(db, userId) {
  db.exec('BEGIN');
  try {
    const addProduct = db.prepare(
      'INSERT INTO products (user_id, name, price, stock, category, ai_answers) VALUES (?, ?, ?, ?, ?, ?)',
    );
    for (const p of PRODUCTS) {
      addProduct.run(userId, ...p);
    }
    const addOrder = db.prepare(
      `INSERT INTO orders (user_id, code, customer, channel, items, amount, city, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    ORDERS.forEach((o, i) => {
      addOrder.run(userId, `RPL-${1001 + i}`, o[0], o[1], o[2], o[3], o[4], o[5], daysAgo(o[6]));
    });
    const addConversation = db.prepare(
      'INSERT INTO conversations (user_id, customer, channel, needs_human, unread, updated_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
    );
    const addMessage = db.prepare(
      'INSERT INTO messages (conversation_id, user_id, sender, by_ai, text, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    );
    for (const c of CONVERSATIONS) {
      const last = c.lines[c.lines.length - 1];
      const {id} = addConversation.get(userId, c.customer, c.channel, c.needsHuman, c.unread, minutesAgo(last[3]));
      for (const [sender, byAi, text, ago] of c.lines) {
        addMessage.run(id, userId, sender, byAi, text, minutesAgo(ago));
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
