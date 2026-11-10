import type {StatusDotVariant} from '@astryxdesign/core/StatusDot';
import type {OrderStatus} from '../data';

export function statusVariant(status: OrderStatus): StatusDotVariant {
  switch (status) {
    case 'New':
      return 'accent';
    case 'Awaiting payment':
      return 'warning';
    case 'Paid':
    case 'Delivered':
      return 'success';
    case 'Out for delivery':
      return 'neutral';
  }
}

export function changeLabel(current: number, previous: number): string {
  if (previous === 0) {
    return current === 0 ? 'No activity yet' : 'New this week';
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}% vs last week`;
}
