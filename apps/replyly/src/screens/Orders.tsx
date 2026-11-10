import {useState} from 'react';
import {VStack, HStack, Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Table, proportional, pixel} from '@astryxdesign/core/Table';
import type {TableColumn} from '@astryxdesign/core/Table';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {ORDERS, naira} from '../data';
import type {Order, OrderStatus} from '../data';
import {statusVariant} from './shared';

type OrderRow = Order & Record<string, unknown>;

const FILTERS: Array<OrderStatus | 'All'> = [
  'All',
  'New',
  'Awaiting payment',
  'Paid',
  'Out for delivery',
  'Delivered',
];

const columns: TableColumn<OrderRow>[] = [
  {key: 'id', header: 'Order', width: pixel(100)},
  {key: 'customer', header: 'Customer', width: pixel(150)},
  {key: 'channel', header: 'Channel', width: pixel(110)},
  {key: 'items', header: 'Items', width: proportional(1)},
  {key: 'city', header: 'Delivery', width: pixel(150)},
  {
    key: 'amount',
    header: 'Amount',
    width: pixel(110),
    renderCell: item => naira(item.amount),
  },
  {
    key: 'status',
    header: 'Status',
    width: pixel(170),
    renderCell: item => (
      <HStack gap={2} vAlign="center">
        <StatusDot variant={statusVariant(item.status)} label={item.status} />
        <Text type="supporting">{item.status}</Text>
      </HStack>
    ),
  },
];

export default function Orders() {
  const [filter, setFilter] = useState<OrderStatus | 'All'>('All');
  const rows = (
    filter === 'All' ? ORDERS : ORDERS.filter(o => o.status === filter)
  ) as OrderRow[];

  return (
    <Layout height="fill">
      <LayoutContent padding={6}>
        <VStack gap={5}>
          <VStack gap={1}>
            <Heading level={2}>Orders</Heading>
            <Text color="secondary">
              Every order captured from WhatsApp and Instagram chats.
            </Text>
          </VStack>
          <HStack gap={2}>
            {FILTERS.map(f => (
              <Button
                key={f}
                label={f}
                size="sm"
                variant={filter === f ? 'primary' : 'secondary'}
                onClick={() => setFilter(f)}
              />
            ))}
          </HStack>
          <Table<OrderRow>
            data={rows}
            columns={columns}
            idKey="id"
            density="compact"
            dividers="rows"
            hasHover
          />
        </VStack>
      </LayoutContent>
    </Layout>
  );
}
