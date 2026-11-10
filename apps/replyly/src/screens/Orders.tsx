import {useState} from 'react';
import {VStack, HStack, Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Selector} from '@astryxdesign/core/Selector';
import {Table, proportional, pixel} from '@astryxdesign/core/Table';
import type {TableColumn} from '@astryxdesign/core/Table';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {api} from '../api';
import type {Order} from '../api';
import {useAsync} from '../hooks';
import {CHANNELS, STATUSES, naira} from '../data';
import type {Channel, OrderStatus} from '../data';
import {statusVariant} from './shared';

type OrderRow = Order & Record<string, unknown>;
const FILTERS: Array<OrderStatus | 'All'> = ['All', ...STATUSES];

export default function Orders() {
  const orders = useAsync(api.orders);
  const [filter, setFilter] = useState<OrderStatus | 'All'>('All');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({customer: '', channel: 'WhatsApp' as Channel, items: '', amount: '', city: ''});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const all = orders.data ?? [];
  const rows = (filter === 'All' ? all : all.filter(o => o.status === filter)) as OrderRow[];

  const changeStatus = async (id: number, status: OrderStatus) => {
    setError(null);
    try {
      await api.setOrderStatus(id, status);
      await orders.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the order');
    }
  };

  const addOrder = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.addOrder({...form, amount: Number(form.amount)});
      setForm({customer: '', channel: 'WhatsApp', items: '', amount: '', city: ''});
      setShowForm(false);
      await orders.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the order');
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumn<OrderRow>[] = [
    {key: 'code', header: 'Order', width: pixel(100)},
    {key: 'customer', header: 'Customer', width: pixel(150)},
    {key: 'channel', header: 'Channel', width: pixel(100)},
    {key: 'items', header: 'Items', width: proportional(1)},
    {key: 'city', header: 'Delivery', width: pixel(140)},
    {key: 'amount', header: 'Amount', width: pixel(110), renderCell: item => naira(item.amount)},
    {
      key: 'status',
      header: 'Status',
      width: pixel(210),
      renderCell: item => (
        <HStack gap={2} vAlign="center">
          <StatusDot variant={statusVariant(item.status)} label={item.status} />
          <Selector
            label={`Status of ${item.code}`}
            size="sm"
            variant="ghost"
            options={STATUSES}
            value={item.status}
            onChange={value => void changeStatus(item.id, value as OrderStatus)}
          />
        </HStack>
      ),
    },
  ];

  return (
    <Layout height="fill">
      <LayoutContent padding={6}>
        <VStack gap={5}>
          <HStack hAlign="between" vAlign="center">
            <VStack gap={1}>
              <Heading level={2}>Orders</Heading>
              <Text color="secondary">Every order from your WhatsApp and Instagram chats.</Text>
            </VStack>
            <Button label={showForm ? 'Cancel' : 'Add order'} variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm(v => !v)} />
          </HStack>

          {showForm ? (
            <Card>
              <VStack gap={4}>
                <Heading level={4}>New order</Heading>
                <Grid gap={3} columns={{minWidth: 200, repeat: 'fit'}}>
                  <TextInput label="Customer name" value={form.customer} onChange={v => setForm(f => ({...f, customer: v}))} />
                  <Selector label="Channel" options={[...CHANNELS]} value={form.channel} onChange={v => setForm(f => ({...f, channel: v as Channel}))} />
                  <TextInput label="Items" placeholder="2 × Ankara wrap dress" value={form.items} onChange={v => setForm(f => ({...f, items: v}))} />
                  <TextInput label="Amount (₦)" inputMode="numeric" value={form.amount} onChange={v => setForm(f => ({...f, amount: v}))} />
                  <TextInput label="Delivery area" placeholder="Lekki, Lagos" value={form.city} onChange={v => setForm(f => ({...f, city: v}))} />
                </Grid>
                <HStack><Button label="Save order" variant="primary" isLoading={saving} onClick={addOrder} /></HStack>
              </VStack>
            </Card>
          ) : null}

          <HStack gap={2}>
            {FILTERS.map(f => (
              <Button key={f} label={f} size="sm" variant={filter === f ? 'primary' : 'secondary'} onClick={() => setFilter(f)} />
            ))}
          </HStack>

          {error || orders.error ? <Text color="secondary">{error ?? orders.error}</Text> : null}

          {orders.isLoading ? (
            <Text color="secondary">Loading orders…</Text>
          ) : rows.length === 0 ? (
            <Text color="secondary">{all.length === 0 ? 'No orders yet. Add your first one above.' : 'No orders with this status.'}</Text>
          ) : (
            <Table<OrderRow> data={rows} columns={columns} idKey="id" density="compact" dividers="rows" hasHover />
          )}
        </VStack>
      </LayoutContent>
    </Layout>
  );
}
