import {useState} from 'react';
import {VStack} from '@astryxdesign/core/Layout';
import {Center} from '@astryxdesign/core/Center';
import {Card} from '@astryxdesign/core/Card';
import {Text, Heading} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {Link} from '@astryxdesign/core/Link';
import {Icon} from '@astryxdesign/core/Icon';
import {BoltIcon} from '@heroicons/react/24/outline';
import {signIn} from '../session';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    if (password.length === 0) {
      setError('Enter your password');
      return;
    }
    signIn(email.trim());
    window.location.hash = '#/';
  };

  return (
    <Center padding={6}>
      <VStack gap={4}>
        <VStack gap={2} hAlign="center">
          <Icon icon={BoltIcon} size="lg" />
          <Text weight="bold">Replyly</Text>
        </VStack>
        <Card padding={8} width="100%">
          <VStack gap={4}>
            <VStack gap={1}>
              <Heading level={3}>Sign in</Heading>
              <Text color="secondary">
                Demo mode: any email and password will work.
              </Text>
            </VStack>
            <TextInput
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
            />
            <TextInput
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              status={error ? {type: 'error', message: error} : undefined}
            />
            <Button label="Sign in" variant="primary" onClick={submit} />
            <Link href="#/welcome">Back to home</Link>
          </VStack>
        </Card>
      </VStack>
    </Center>
  );
}
