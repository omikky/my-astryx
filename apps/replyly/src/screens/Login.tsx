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
import {api} from '../api';
import type {User} from '../api';

type Mode = 'signin' | 'signup';

export default function Login({onAuthed}: {onAuthed: (user: User) => void}) {
  const [mode, setMode] = useState<Mode>('signin');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const user = isSignup
        ? await api.signup({email, password, businessName})
        : await api.login({email, password});
      onAuthed(user);
      window.location.hash = '#/';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
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
              <Heading level={3}>{isSignup ? 'Create your account' : 'Sign in'}</Heading>
              <Text color="secondary">
                {isSignup ? 'Set up your business in under a minute.' : 'Welcome back.'}
              </Text>
            </VStack>
            {isSignup ? (
              <TextInput label="Business name" autoComplete="organization" value={businessName} onChange={setBusinessName} />
            ) : null}
            <TextInput label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
            <TextInput
              label="Password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={setPassword}
              status={error ? {type: 'error', message: error} : undefined}
            />
            <Button label={isSignup ? 'Create account' : 'Sign in'} variant="primary" isLoading={busy} onClick={submit} />
            <Button
              label={isSignup ? 'I already have an account' : 'Create a new account'}
              variant="secondary"
              onClick={() => {
                setMode(isSignup ? 'signin' : 'signup');
                setError(null);
              }}
            />
            <Link href="#/welcome">Back to home</Link>
          </VStack>
        </Card>
      </VStack>
    </Center>
  );
}
