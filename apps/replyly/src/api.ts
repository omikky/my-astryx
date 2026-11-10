import type {Product} from './data';

export type ReplyResult = {
  reply: string;
  needsHuman: boolean;
  source: 'claude' | 'rules';
};

export type PaymentLinkResult = {
  url: string | null;
  reference: string;
  source: 'paystack' | 'demo';
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }
  return data as T;
}

export function requestReply(
  messages: Array<{from: 'customer' | 'business'; text: string}>,
  catalogue: Product[],
  business: string,
) {
  return post<ReplyResult>('/api/reply', {
    messages,
    business,
    catalogue: catalogue.map(({name, price, stock}) => ({name, price, stock})),
  });
}

export function requestPaymentLink(input: {
  amount: number;
  email: string;
  orderId: string;
}) {
  return post<PaymentLinkResult>('/api/payment-link', input);
}

export async function fetchStatus(): Promise<{ai: boolean; payments: boolean}> {
  try {
    const response = await fetch('/api/status');
    return await response.json();
  } catch {
    return {ai: false, payments: false};
  }
}
