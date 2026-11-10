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
import {CONVERSATIONS} from '../data';

const styles = stylex.create({
  column: {height: '100%', minHeight: 0},
  scroll: {overflowY: 'auto', minHeight: 0},
  header: {padding: 16, alignItems: 'center'},
});

export default function Inbox() {
  const [selectedId, setSelectedId] = useState(CONVERSATIONS[0].id);
  const selected =
    CONVERSATIONS.find(c => c.id === selectedId) ?? CONVERSATIONS[0];

  const list = (
    <Stack direction="vertical" xstyle={styles.column}>
      <HStack xstyle={styles.header}>
        <Heading level={5}>Conversations</Heading>
      </HStack>
      <Divider />
      <StackItem size="fill" xstyle={styles.scroll}>
        <List density="compact" hasDividers={false}>
          {CONVERSATIONS.map(c => (
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
              placeholder={`Reply to ${selected.customer} yourself`}
              onSubmit={() => {}}
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
