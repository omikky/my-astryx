import {VStack, HStack, Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Button} from '@astryxdesign/core/Button';
import {Divider} from '@astryxdesign/core/Divider';

const FEATURES = [
  {
    title: 'Answers customers in seconds',
    body: 'Prices, sizes, stock and delivery questions answered on WhatsApp and Instagram, day and night, in simple Nigerian English.',
  },
  {
    title: 'Hands off to you when it matters',
    body: 'Haggling, complaints and refunds are flagged "Needs you" so nothing sensitive is left to the AI.',
  },
  {
    title: 'Turns chats into paid orders',
    body: 'Create a Paystack payment link from the chat and see every order, paid or pending, in one place.',
  },
];

const PLANS = [
  {name: 'Starter', price: '₦10,000', note: 'per month', points: ['1 WhatsApp number', 'Up to 500 AI replies', 'Orders and catalogue']},
  {name: 'Growth', price: '₦25,000', note: 'per month', points: ['WhatsApp and Instagram', 'Up to 3,000 AI replies', 'Paystack payment links']},
  {name: 'Business', price: '₦50,000', note: 'per month', points: ['Unlimited AI replies', 'Up to 3 team members', 'Priority support']},
];

export default function Landing() {
  return (
    <Layout>
      <LayoutContent padding={6}>
        <VStack gap={10}>
          <HStack hAlign="between" vAlign="center">
            <Heading level={4}>Replyly</Heading>
            <Button label="Sign in" variant="secondary" href="#/login" />
          </HStack>

          <VStack gap={6} hAlign="center">
            <VStack gap={3} hAlign="center">
              <Heading level={1}>Stop losing sales in your DMs</Heading>
              <Text type="large" color="secondary">
                Replyly answers your WhatsApp and Instagram customers, quotes your prices, and collects payment, so you can sell while you sleep.
              </Text>
            </VStack>
            <HStack gap={3}>
              <Button label="Start free trial" variant="primary" href="#/login" />
              <Button label="See pricing" variant="secondary" onClick={() => document.getElementById("pricing")?.scrollIntoView({behavior: "smooth"})} />
            </HStack>
          </VStack>

          <Grid gap={4} columns={{minWidth: 260, repeat: 'fit'}}>
            {FEATURES.map(f => (
              <Card key={f.title}>
                <VStack gap={2}>
                  <Heading level={4}>{f.title}</Heading>
                  <Text color="secondary">{f.body}</Text>
                </VStack>
              </Card>
            ))}
          </Grid>

          <Divider />

          <VStack gap={5} id="pricing">
            <Heading level={2}>Simple pricing in naira</Heading>
            <Grid gap={4} columns={{minWidth: 260, repeat: 'fit'}}>
              {PLANS.map(p => (
                <Card key={p.name}>
                  <VStack gap={3}>
                    <Heading level={4}>{p.name}</Heading>
                    <HStack gap={1} vAlign="end">
                      <Heading level={2}>{p.price}</Heading>
                      <Text color="secondary">{p.note}</Text>
                    </HStack>
                    <VStack gap={1}>
                      {p.points.map(point => (
                        <Text key={point}>{point}</Text>
                      ))}
                    </VStack>
                    <Button label={`Choose ${p.name}`} variant="secondary" href="#/login" />
                  </VStack>
                </Card>
              ))}
            </Grid>
          </VStack>
        </VStack>
      </LayoutContent>
    </Layout>
  );
}
