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
