import {VStack, HStack, Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
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
import {ORDERS, WEEKLY, naira} from '../data';
import type {Order} from '../data';
import {statusVariant} from './shared';

const METRICS = [
  {label: 'Messages handled by AI', value: '1,358', change: '+22% vs last week'},
  {label: 'Orders this week', value: '186', change: '+14% vs last week'},
  {label: 'Revenue this week', value: naira(2_480_000), change: '+9% vs last week'},
  {label: 'Avg. reply time', value: '8 sec', change: 'Was 41 min before Replyly'},
];

type OrderRow = Order & Record<string, unknown>;

const columns: TableColumn<OrderRow>[] = [
  {key: 'customer', header: 'Customer', width: pixel(160)},
  {key: 'items', header: 'Items', width: proportional(1)},
  {
    key: 'amount',
    header: 'Amount',
    width: pixel(110),
    renderCell: item => naira(item.amount),
  },
  {
    key: 'status',
    header: 'Status',
    width: pixel(180),
    renderCell: item => (
      <HStack gap={2} vAlign="center">
        <StatusDot variant={statusVariant(item.status)} label={item.status} />
        <Text type="supporting">{item.status}</Text>
      </HStack>
    ),
  },
];

export default function Dashboard() {
  const needsAction = ORDERS.filter(
    o => o.status === 'Awaiting payment' || o.status === 'New',
  ) as OrderRow[];

  return (
    <Layout height="fill">
      <LayoutContent padding={6}>
        <VStack gap={6}>
          <VStack gap={1}>
            <Heading level={2}>Good morning, Adaeze's Closet</Heading>
            <Text color="secondary">
              Your assistant is live on WhatsApp and Instagram.
            </Text>
          </VStack>

          <Grid gap={4} columns={{minWidth: 240, repeat: 'fit'}}>
            {METRICS.map(m => (
              <Card key={m.label}>
                <VStack gap={1}>
                  <Text type="supporting" color="secondary">
                    {m.label}
                  </Text>
                  <Heading level={2}>{m.value}</Heading>
                  <Text type="supporting" color="accent">
                    {m.change}
                  </Text>
                </VStack>
              </Card>
            ))}
          </Grid>

          <Grid gap={4} columns={{minWidth: 360, repeat: 'fit'}}>
            <Card>
              <VStack gap={4}>
                <Heading level={4}>Messages and orders, last 7 days</Heading>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={WEEKLY}>
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--color-border)"
                    />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar
                      dataKey="messages"
                      name="Messages"
                      fill="var(--color-data-categorical-blue, #0171E3)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="orders"
                      name="Orders"
                      fill="var(--color-data-categorical-green, #0B991F)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </VStack>
            </Card>

            <Card>
              <VStack gap={4}>
                <Heading level={4}>Needs your attention</Heading>
                <Table<OrderRow>
                  data={needsAction}
                  columns={columns}
                  idKey="id"
                  density="compact"
                  dividers="rows"
                  hasHover
                />
              </VStack>
            </Card>
          </Grid>
        </VStack>
      </LayoutContent>
    </Layout>
  );
}
