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
import {List, ListItem} from '@astryxdesign/core/List';
import {Divider} from '@astryxdesign/core/Divider';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {CONVERSATIONS, PRODUCTS, BUSINESS_NAME} from '../data';
import type {Conversation, ChatLine} from '../data';
import {requestReply} from '../api';

const styles = stylex.create({
  column: {height: '100%', minHeight: 0},
  scroll: {overflowY: 'auto', minHeight: 0},
  header: {padding: 16, alignItems: 'center'},
});

function nowLabel() {
  return new Date().toLocaleTimeString('en-NG', {hour: '2-digit', minute: '2-digit', hour12: false});
}

export default function Inbox() {
  const [conversations, setConversations] = useState<Conversation[]>(CONVERSATIONS);
  const [selectedId, setSelectedId] = useState(CONVERSATIONS[0].id);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = conversations.find(c => c.id === selectedId) ?? conversations[0];

  const append = (id: string, line: ChatLine, needsHuman?: boolean) =>
    setConversations(prev =>
      prev.map(c =>
        c.id === id
          ? {
              ...c,
              preview: line.text,
              needsHuman: needsHuman ?? c.needsHuman,
              lines: [...c.lines, line],
            }
          : c,
      ),
    );

  const simulateCustomer = async (text: string) => {
    const id = selected.id;
    const customerLine: ChatLine = {id: `${Date.now()}-c`, from: 'customer', text, time: nowLabel()};
    append(id, customerLine);
    setError(null);
    setIsThinking(true);
    try {
      const history = [...selected.lines, customerLine].map(l => ({from: l.from, text: l.text}));
      const result = await requestReply(history, PRODUCTS, BUSINESS_NAME);
      append(
        id,
        {id: `${Date.now()}-b`, from: 'business', byAi: true, text: result.reply, time: nowLabel()},
        result.needsHuman,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The AI could not reply. Is the API server running?');
    } finally {
      setIsThinking(false);
    }
  };

  const list = (
    <Stack direction="vertical" xstyle={styles.column}>
      <HStack xstyle={styles.header}>
        <Heading level={5}>Conversations</Heading>
      </HStack>
      <Divider />
      <StackItem size="fill" xstyle={styles.scroll}>
        <List density="compact" hasDividers={false}>
          {conversations.map(c => (
            <ListItem
              key={c.id}
              label={c.customer}
              description={`${c.channel} · ${c.preview}`}
              isSelected={c.id === selectedId}
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
          <Text type="supporting" color="secondary">
            {selected.channel}
          </Text>
        </StackItem>
        <StatusDot
          variant={selected.needsHuman ? 'warning' : 'success'}
          label={selected.needsHuman ? 'Needs you' : 'AI is handling this'}
        />
        <Text type="supporting">
          {selected.needsHuman ? 'Needs you' : 'AI is handling this'}
        </Text>
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
              <ChatMessage
                key={line.id}
                sender={line.from === 'customer' ? 'assistant' : 'user'}>
                <ChatMessageBubble
                  metadata={
                    <ChatMessageMetadata
                      timestamp={`${line.time}${line.byAi ? ' · Replyly AI' : ''}`}
                    />
                  }>
                  {line.text}
                </ChatMessageBubble>
              </ChatMessage>
            ))}
            {isThinking ? (
              <ChatMessage sender="user">
                <ChatMessageBubble>Typing…</ChatMessageBubble>
              </ChatMessage>
            ) : null}
            {error ? (
              <Text type="supporting" color="secondary">
                {error}
              </Text>
            ) : null}
          </ChatMessageList>
        </ChatLayout>
      </StackItem>
    </Stack>
  );

  return (
    <Layout
      height="fill"
      start={<LayoutPanel width={320} padding={0}>{list}</LayoutPanel>}
      content={<LayoutContent padding={0}>{thread}</LayoutContent>}
    />
  );
}
