import {useState} from 'react';
import {VStack, HStack, Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Button} from '@astryxdesign/core/Button';
import {Grid} from '@astryxdesign/core/Grid';
import {Table, proportional, pixel} from '@astryxdesign/core/Table';
import type {TableColumn} from '@astryxdesign/core/Table';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {api} from '../api';
import type {Order, User} from '../api';
import {useAsync} from '../hooks';
import {naira} from '../data';
import {statusVariant, changeLabel} from './shared';

type OrderRow = Order & Record<string, unknown>;

const columns: TableColumn<OrderRow>[] = [
  {key: 'customer', header: 'Customer', width: pixel(160)},
  {key: 'items', header: 'Items', width: proportional(1)},
  {key: 'amount', header: 'Amount', width: pixel(110), renderCell: item => naira(item.amount)},
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

export default function Dashboard({user}: {user: User}) {
  const stats = useAsync(api.stats);
  const orders = useAsync(api.orders);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const loadSample = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      await api.seed();
      await Promise.all([stats.reload(), orders.reload()]);
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : 'Could not load sample data');
    } finally {
      setSeeding(false);
    }
  };

  const s = stats.data;
  const needsAction = (orders.data ?? []).filter(
    o => o.status === 'Awaiting payment' || o.status === 'New',
  ) as OrderRow[];
  const isEmpty = !orders.isLoading && (orders.data ?? []).length === 0;

  const metrics = s
    ? [
        {label: 'Messages handled by AI', value: s.thisWeek.aiMessages.toLocaleString('en-NG'), change: changeLabel(s.thisWeek.aiMessages, s.lastWeek.aiMessages)},
        {label: 'Orders this week', value: String(s.thisWeek.orders), change: changeLabel(s.thisWeek.orders, s.lastWeek.orders)},
        {label: 'Revenue this week (paid)', value: naira(s.thisWeek.revenue), change: changeLabel(s.thisWeek.revenue, s.lastWeek.revenue)},
        {label: 'Chats needing you', value: String(s.needsYou), change: s.needsYou === 0 ? 'All clear' : 'Open the Inbox'},
      ]
    : [];

  return (
    <Layout height="fill">
      <LayoutContent padding={6}>
        <VStack gap={6}>
          <VStack gap={1}>
            <Heading level={2}>{`Welcome, ${user.businessName}`}</Heading>
            <Text color="secondary">Your sales activity from WhatsApp and Instagram.</Text>
          </VStack>

          {isEmpty ? (
            <Card>
              <VStack gap={3}>
                <Heading level={4}>Nothing here yet</Heading>
                <Text color="secondary">
                  Add your products in the Catalogue and your first orders will appear here. Or load a set of sample data to explore the app first.
                </Text>
                <HStack gap={2}>
                  <Button label="Load sample data" variant="primary" isLoading={seeding} onClick={loadSample} />
                  <Button label="Add a product" variant="secondary" href="#/catalogue" />
                </HStack>
                {seedError ? <Text type="supporting" color="secondary">{seedError}</Text> : null}
              </VStack>
            </Card>
          ) : null}

          {stats.error ? <Text color="secondary">{stats.error}</Text> : null}

          <Grid gap={4} columns={{minWidth: 240, repeat: 'fit'}}>
            {metrics.map(m => (
              <Card key={m.label}>
                <VStack gap={1}>
                  <Text type="supporting" color="secondary">{m.label}</Text>
                  <Heading level={2}>{m.value}</Heading>
                  <Text type="supporting" color="accent">{m.change}</Text>
                </VStack>
              </Card>
            ))}
          </Grid>

          <Grid gap={4} columns={{minWidth: 360, repeat: 'fit'}}>
            <Card>
              <VStack gap={4}>
                <Heading level={4}>Messages and orders, last 7 days</Heading>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={s?.weekly ?? []}>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="messages" name="Messages" fill="var(--color-data-categorical-blue, #0171E3)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="orders" name="Orders" fill="var(--color-data-categorical-green, #0B991F)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </VStack>
            </Card>

            <Card>
              <VStack gap={4}>
                <Heading level={4}>Needs your attention</Heading>
                {needsAction.length === 0 ? (
                  <Text color="secondary">No orders waiting on you.</Text>
                ) : (
                  <Table<OrderRow> data={needsAction} columns={columns} idKey="id" density="compact" dividers="rows" hasHover />
                )}
              </VStack>
            </Card>
          </Grid>
        </VStack>
      </LayoutContent>
    </Layout>
  );
}
