export type Channel = 'WhatsApp' | 'Instagram';

export type OrderStatus =
  | 'New'
  | 'Awaiting payment'
  | 'Paid'
  | 'Out for delivery'
  | 'Delivered';

export type Order = {
  id: string;
  customer: string;
  channel: Channel;
  items: string;
  amount: number;
  city: string;
  status: OrderStatus;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  answeredByAi: number;
};

export type ChatLine = {
  id: string;
  from: 'customer' | 'business';
  text: string;
  time: string;
  byAi?: boolean;
};

export type Conversation = {
  id: string;
  customer: string;
  channel: Channel;
  preview: string;
  unread: number;
  needsHuman: boolean;
  lines: ChatLine[];
};

export const naira = (value: number) => `₦${value.toLocaleString('en-NG')}`;

export const ORDERS: Order[] = [
  {id: 'RPL-1042', customer: 'Chioma Okafor', channel: 'WhatsApp', items: '2 × Ankara wrap dress', amount: 56000, city: 'Lekki, Lagos', status: 'Awaiting payment'},
  {id: 'RPL-1041', customer: 'Tunde Bakare', channel: 'Instagram', items: '1 × Leather slides (size 43)', amount: 18500, city: 'Ikeja, Lagos', status: 'Paid'},
  {id: 'RPL-1040', customer: 'Amina Yusuf', channel: 'WhatsApp', items: '3 × Shea butter body cream', amount: 27000, city: 'Wuse 2, Abuja', status: 'Out for delivery'},
  {id: 'RPL-1039', customer: 'Emeka Nwosu', channel: 'Instagram', items: '1 × Gele and aso-oke set', amount: 85000, city: 'Garki, Abuja', status: 'New'},
  {id: 'RPL-1038', customer: 'Ngozi Eze', channel: 'WhatsApp', items: '2 × Beaded clutch bag', amount: 34000, city: 'Yaba, Lagos', status: 'Delivered'},
  {id: 'RPL-1037', customer: 'Bola Adeyemi', channel: 'WhatsApp', items: '1 × Ankara wrap dress', amount: 28000, city: 'Surulere, Lagos', status: 'Delivered'},
  {id: 'RPL-1036', customer: 'Sadiq Garba', channel: 'Instagram', items: '2 × Leather slides (size 44)', amount: 37000, city: 'Maitama, Abuja', status: 'Paid'},
  {id: 'RPL-1035', customer: 'Funke Alabi', channel: 'WhatsApp', items: '1 × Shea butter body cream', amount: 9000, city: 'Ajah, Lagos', status: 'Awaiting payment'},
];

export const PRODUCTS: Product[] = [
  {id: 'p1', name: 'Ankara wrap dress', price: 28000, stock: 14, category: 'Fashion', answeredByAi: 112},
  {id: 'p2', name: 'Leather slides', price: 18500, stock: 31, category: 'Footwear', answeredByAi: 87},
  {id: 'p3', name: 'Shea butter body cream', price: 9000, stock: 56, category: 'Beauty', answeredByAi: 143},
  {id: 'p4', name: 'Gele and aso-oke set', price: 85000, stock: 4, category: 'Fashion', answeredByAi: 39},
  {id: 'p5', name: 'Beaded clutch bag', price: 17000, stock: 0, category: 'Accessories', answeredByAi: 64},
  {id: 'p6', name: 'Adire face towel set', price: 12000, stock: 22, category: 'Home', answeredByAi: 21},
];

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    customer: 'Chioma Okafor',
    channel: 'WhatsApp',
    preview: 'Please send your account details',
    unread: 1,
    needsHuman: false,
    lines: [
      {id: 'l1', from: 'customer', text: 'Hi, do you still have the Ankara wrap dress in size 12?', time: '09:14'},
      {id: 'l2', from: 'business', byAi: true, text: 'Good morning Chioma! Yes, size 12 is available at ₦28,000. We deliver in Lagos within 24 hours.', time: '09:14'},
      {id: 'l3', from: 'customer', text: 'Nice. I want two. Delivery to Lekki phase 1 how much?', time: '09:16'},
      {id: 'l4', from: 'business', byAi: true, text: 'Two dresses is ₦56,000. Delivery to Lekki Phase 1 is ₦2,500. Total: ₦58,500. Should I generate your payment link?', time: '09:16'},
      {id: 'l5', from: 'customer', text: 'Please send your account details', time: '09:18'},
    ],
  },
  {
    id: 'c2',
    customer: 'Emeka Nwosu',
    channel: 'Instagram',
    preview: 'Can you do ₦70k for the aso-oke set?',
    unread: 2,
    needsHuman: true,
    lines: [
      {id: 'l1', from: 'customer', text: 'How much for the gele and aso-oke set?', time: '10:02'},
      {id: 'l2', from: 'business', byAi: true, text: 'The full set is ₦85,000. It comes with the gele, aso-oke and a matching fan.', time: '10:02'},
      {id: 'l3', from: 'customer', text: 'Can you do ₦70k for the aso-oke set?', time: '10:05'},
    ],
  },
  {
    id: 'c3',
    customer: 'Amina Yusuf',
    channel: 'WhatsApp',
    preview: 'Thank you, I have received it',
    unread: 0,
    needsHuman: false,
    lines: [
      {id: 'l1', from: 'business', byAi: true, text: 'Your order RPL-1040 is out for delivery to Wuse 2. Rider: Musa, 0803 000 0000.', time: '08:30'},
      {id: 'l2', from: 'customer', text: 'Thank you, I have received it', time: '11:47'},
    ],
  },
  {
    id: 'c4',
    customer: 'Tunde Bakare',
    channel: 'Instagram',
    preview: 'Payment sent, abeg confirm',
    unread: 1,
    needsHuman: false,
    lines: [
      {id: 'l1', from: 'customer', text: 'Payment sent, abeg confirm', time: '12:20'},
    ],
  },
];

export const WEEKLY = [
  {day: 'Mon', messages: 142, orders: 18},
  {day: 'Tue', messages: 168, orders: 22},
  {day: 'Wed', messages: 151, orders: 19},
  {day: 'Thu', messages: 189, orders: 27},
  {day: 'Fri', messages: 236, orders: 34},
  {day: 'Sat', messages: 274, orders: 41},
  {day: 'Sun', messages: 198, orders: 25},
];
