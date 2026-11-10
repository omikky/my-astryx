import {useState} from 'react';
import {VStack, HStack, Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Table, proportional, pixel} from '@astryxdesign/core/Table';
import type {TableColumn} from '@astryxdesign/core/Table';
import {ORDERS, naira} from '../data';
import type {Order} from '../data';
import {requestPaymentLink} from '../api';
import type {PaymentLinkResult} from '../api';

type OrderRow = Order & Record<string, unknown>;

type Created = {order: Order; result: PaymentLinkResult};

export default function Payments() {
  const [email, setEmail] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const unpaid = ORDERS.filter(
    o => o.status === 'Awaiting payment' || o.status === 'New',
  ) as OrderRow[];

  const createLink = async (order: Order) => {
    setError(null);
    setCopied(false);
    setBusyId(order.id);
    try {
      const result = await requestPaymentLink({
        amount: order.amount,
        email: email.trim(),
        orderId: order.id,
      });
      setCreated({order, result});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the link');
    } finally {
      setBusyId(null);
    }
  };

  const message = created?.result.url
    ? `Hello ${created.order.customer.split(' ')[0]}, your order ${created.order.id} is ${naira(created.order.amount)}. Pay securely here: ${created.result.url}`
    : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setError('Copy is blocked in this browser. Select the message and copy it.');
    }
  };

  const columns: TableColumn<OrderRow>[] = [
    {key: 'id', header: 'Order', width: pixel(100)},
    {key: 'customer', header: 'Customer', width: pixel(160)},
    {key: 'items', header: 'Items', width: proportional(1)},
    {
      key: 'amount',
      header: 'Amount',
      width: pixel(110),
      renderCell: item => naira(item.amount),
    },
    {
      key: 'action',
      header: '',
      width: pixel(150),
      renderCell: item => (
        <Button
          label="Create link"
          size="sm"
          variant="secondary"
          isLoading={busyId === item.id}
          onClick={() => createLink(item)}
        />
      ),
    },
  ];

  return (
    <Layout height="fill">
      <LayoutContent padding={6}>
        <VStack gap={5}>
          <VStack gap={1}>
            <Heading level={2}>Payments</Heading>
            <Text color="secondary">
              Create a Paystack payment link for an order and send it in the chat.
            </Text>
          </VStack>

          <TextInput
            label="Customer email (Paystack needs one for the receipt)"
            type="email"
            placeholder="customer@example.com"
            value={email}
            onChange={setEmail}
            status={error ? {type: 'error', message: error} : undefined}
          />

          <Table<OrderRow>
            data={unpaid}
            columns={columns}
            idKey="id"
            density="compact"
            dividers="rows"
            hasHover
          />

          {created ? (
            <Card>
              <VStack gap={3}>
                <Heading level={4}>
                  {`Link for ${created.order.id} · ${naira(created.order.amount)}`}
                </Heading>
                {created.result.url ? (
                  <>
                    <Text>{message}</Text>
                    <HStack gap={2}>
                      <Button
                        label={copied ? 'Copied' : 'Copy message'}
                        variant="primary"
                        onClick={copy}
                      />
                    </HStack>
                  </>
                ) : (
                  <Text color="secondary">
                    {`Demo mode: no Paystack key is set on the server, so no real link was created (reference ${created.result.reference}). Set PAYSTACK_SECRET_KEY to generate real payment links.`}
                  </Text>
                )}
              </VStack>
            </Card>
          ) : null}
        </VStack>
      </LayoutContent>
    </Layout>
  );
}
