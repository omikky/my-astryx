import {useState} from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Layout,
  LayoutContent,
  LayoutPanel,
  Stack,
  StackItem,
  HStack,
} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {
  ChatComposer,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
} from '@astryxdesign/core/Chat';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {List, ListItem} from '@astryxdesign/core/List';
import {Divider} from '@astryxdesign/core/Divider';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {api} from '../api';
import type {Conversation} from '../api';
import {useAsync} from '../hooks';
import {clockTime} from '../data';

const styles = stylex.create({
  column: {height: '100%', minHeight: 0},
  scroll: {overflowY: 'auto', minHeight: 0},
  header: {padding: 16, alignItems: 'center'},
  empty: {padding: 24},
});

export default function Inbox() {
  const conversations = useAsync(api.conversations);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = conversations.data ?? [];
  const selected = list.find(c => c.id === selectedId) ?? list[0] ?? null;

  const replace = (updated: Conversation) =>
    conversations.setData(prev =>
      (prev ?? []).map(c => (c.id === updated.id ? updated : c)),
    );

  const simulateCustomer = async (text: string) => {
    if (!selected) {
      return;
    }
    setError(null);
    setIsThinking(true);
    try {
      replace(await api.testMessage(selected.id, text));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The AI could not reply.');
    } finally {
      setIsThinking(false);
    }
  };

  const markHandled = async () => {
    if (!selected) {
      return;
    }
    try {
      replace(await api.markHandled(selected.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the chat.');
    }
  };

  if (conversations.isLoading) {
    return (
      <Layout height="fill">
        <LayoutContent padding={6}><Text color="secondary">Loading conversations…</Text></LayoutContent>
      </Layout>
    );
  }

  if (!selected) {
    return (
      <Layout height="fill">
        <LayoutContent padding={6}>
          <Stack direction="vertical" gap={2} xstyle={styles.empty}>
            <Heading level={3}>No conversations yet</Heading>
            <Text color="secondary">
              Chats from WhatsApp and Instagram will appear here once they are connected. To try the AI now, load sample data from the Dashboard.
            </Text>
            <HStack><Button label="Go to Dashboard" variant="secondary" href="#/" /></HStack>
          </Stack>
        </LayoutContent>
      </Layout>
    );
  }

  const listPane = (
    <Stack direction="vertical" xstyle={styles.column}>
      <HStack xstyle={styles.header}>
        <Heading level={5}>Conversations</Heading>
      </HStack>
      <Divider />
      <StackItem size="fill" xstyle={styles.scroll}>
        <List density="compact" hasDividers={false}>
          {list.map(c => (
            <ListItem
              key={c.id}
              label={c.customer}
              description={`${c.channel} · ${c.preview}`}
              isSelected={c.id === selected.id}
              onClick={() => setSelectedId(c.id)}
              startContent={<Avatar name={c.customer} size="md" />}
              endContent={
                c.needsHuman ? (
                  <Badge label="Needs you" variant="warning" />
                ) : c.unread > 0 ? (
                  <Badge label={String(c.unread)} variant="neutral" />
                ) : undefined
              }
            />
          ))}
        </List>
      </StackItem>
    </Stack>
  );

  const thread = (
    <Stack direction="vertical" xstyle={styles.column}>
      <HStack gap={3} xstyle={styles.header}>
        <Avatar name={selected.customer} size="md" />
        <StackItem size="fill">
          <Heading level={5}>{selected.customer}</Heading>
          <Text type="supporting" color="secondary">{selected.channel}</Text>
        </StackItem>
        <StatusDot variant={selected.needsHuman ? 'warning' : 'success'} label={selected.needsHuman ? 'Needs you' : 'AI is handling this'} />
        <Text type="supporting">{selected.needsHuman ? 'Needs you' : 'AI is handling this'}</Text>
        {selected.needsHuman ? <Button label="Mark as handled" size="sm" variant="secondary" onClick={markHandled} /> : null}
      </HStack>
      <Divider />
      <StackItem size="fill" xstyle={styles.scroll}>
        <ChatLayout
          composer={
            <ChatComposer
              placeholder={`Test the AI: type a message as ${selected.customer}`}
              isDisabled={isThinking}
              onSubmit={simulateCustomer}
            />
          }>
          <ChatMessageList density="balanced">
            {selected.lines.map(line => (
              <ChatMessage key={line.id} sender={line.from === 'customer' ? 'assistant' : 'user'}>
                <ChatMessageBubble
                  metadata={
                    <ChatMessageMetadata timestamp={`${clockTime(line.createdAt)}${line.byAi ? ' · Replyly AI' : ''}`} />
                  }>
                  {line.text}
                </ChatMessageBubble>
              </ChatMessage>
            ))}
            {isThinking ? (
              <ChatMessage sender="user"><ChatMessageBubble>Typing…</ChatMessageBubble></ChatMessage>
            ) : null}
            {error ? <Text type="supporting" color="secondary">{error}</Text> : null}
          </ChatMessageList>
        </ChatLayout>
      </StackItem>
    </Stack>
  );

  return (
    <Layout
      height="fill"
      start={<LayoutPanel width={320} padding={0}>{listPane}</LayoutPanel>}
      content={<LayoutContent padding={0}>{thread}</LayoutContent>}
    />
  );
}
