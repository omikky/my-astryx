export type Channel = 'WhatsApp' | 'Instagram';

export const CHANNELS: Channel[] = ['WhatsApp', 'Instagram'];

export type OrderStatus =
  | 'New'
  | 'Awaiting payment'
  | 'Paid'
  | 'Out for delivery'
  | 'Delivered';

export const STATUSES: OrderStatus[] = [
  'New',
  'Awaiting payment',
  'Paid',
  'Out for delivery',
  'Delivered',
];

export const naira = (value: number) => `₦${value.toLocaleString('en-NG')}`;

export const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-NG', {hour: '2-digit', minute: '2-digit', hour12: false});
