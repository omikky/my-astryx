import type {Channel, OrderStatus} from './data';

export type User = {id: number; email: string; name: string; businessName: string};

export type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  answeredByAi: number;
};

export type Order = {
  id: number;
  code: string;
  customer: string;
  channel: Channel;
  items: string;
  amount: number;
  city: string;
  status: OrderStatus;
  createdAt: string;
};

export type ChatLine = {
  id: number;
  from: 'customer' | 'business';
  byAi: boolean;
  text: string;
  createdAt: string;
};

export type Conversation = {
  id: number;
  customer: string;
  channel: Channel;
  needsHuman: boolean;
  unread: number;
  preview: string;
  updatedAt: string;
  lines: ChatLine[];
};

export type WeekTotals = {orders: number; revenue: number; aiMessages: number};

export type Stats = {
  thisWeek: WeekTotals;
  lastWeek: WeekTotals;
  weekly: Array<{day: string; messages: number; orders: number}>;
  needsYou: number;
};

export type PaymentLinkResult = {
  url: string | null;
  reference: string;
  source: 'paystack' | 'demo';
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : {'content-type': 'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, data.error ?? `Request failed (${response.status})`);
  }
  return data as T;
}

export const api = {
  me: () => request<{user: User}>('GET', '/api/auth/me').then(r => r.user),
  signup: (input: {email: string; password: string; businessName: string; name?: string}) =>
    request<{user: User}>('POST', '/api/auth/signup', input).then(r => r.user),
  login: (input: {email: string; password: string}) =>
    request<{user: User}>('POST', '/api/auth/login', input).then(r => r.user),
  logout: () => request<{ok: true}>('POST', '/api/auth/logout', {}),

  products: () => request<{products: Product[]}>('GET', '/api/products').then(r => r.products),
  addProduct: (input: {name: string; price: number; stock: number; category: string}) =>
    request<{product: Product}>('POST', '/api/products', input).then(r => r.product),
  deleteProduct: (id: number) => request<{ok: true}>('DELETE', `/api/products/${id}`),

  orders: () => request<{orders: Order[]}>('GET', '/api/orders').then(r => r.orders),
  addOrder: (input: {customer: string; channel: Channel; items: string; amount: number; city: string}) =>
    request<{order: Order}>('POST', '/api/orders', input).then(r => r.order),
  setOrderStatus: (id: number, status: OrderStatus) =>
    request<{order: Order}>('PATCH', `/api/orders/${id}`, {status}).then(r => r.order),

  paymentLink: (input: {orderId: number; email: string}) =>
    request<PaymentLinkResult>('POST', '/api/payment-link', input),

  conversations: () =>
    request<{conversations: Conversation[]}>('GET', '/api/conversations').then(r => r.conversations),
  markHandled: (id: number) =>
    request<{conversation: Conversation}>('PATCH', `/api/conversations/${id}`, {needsHuman: false}).then(
      r => r.conversation,
    ),
  testMessage: (id: number, text: string) =>
    request<{conversation: Conversation}>('POST', `/api/conversations/${id}/test-message`, {text}).then(
      r => r.conversation,
    ),

  stats: () => request<Stats>('GET', '/api/stats'),
  seed: () => request<{ok: true}>('POST', '/api/seed', {}),
};
