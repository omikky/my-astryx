import {useEffect, useState} from 'react';
import {Theme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {AppShell} from '@astryxdesign/core/AppShell';
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import {NavIcon} from '@astryxdesign/core/NavIcon';
import {Icon} from '@astryxdesign/core/Icon';
import {Center} from '@astryxdesign/core/Center';
import {Text} from '@astryxdesign/core/Text';
import {
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  ShoppingBagIcon,
  TagIcon,
  CreditCardIcon,
  ArrowRightStartOnRectangleIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import Dashboard from './screens/Dashboard';
import Inbox from './screens/Inbox';
import Orders from './screens/Orders';
import Catalogue from './screens/Catalogue';
import Payments from './screens/Payments';
import Landing from './screens/Landing';
import Login from './screens/Login';
import {api} from './api';
import type {User} from './api';

const ROUTES = {
  '/': {label: 'Dashboard', icon: ChartBarSquareIcon},
  '/inbox': {label: 'Inbox', icon: ChatBubbleLeftRightIcon},
  '/orders': {label: 'Orders', icon: ShoppingBagIcon},
  '/catalogue': {label: 'Catalogue', icon: TagIcon},
  '/payments': {label: 'Payments', icon: CreditCardIcon},
} as const;

type RoutePath = keyof typeof ROUTES;
type PublicPath = '/welcome' | '/login';

function currentPath(signedIn: boolean): RoutePath | PublicPath {
  const path = window.location.hash.replace(/^#/, '') || '/';
  if (path === '/welcome' || path === '/login') {
    return path;
  }
  if (!signedIn) {
    return '/welcome';
  }
  return path in ROUTES ? (path as RoutePath) : '/';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsChecking(false));
    const onChange = () => setTick(t => t + 1);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  useEffect(() => {
    if (user && window.location.hash === '#/login') {
      window.location.hash = '#/';
    }
  }, [user, tick]);

  if (isChecking) {
    return <Theme theme={neutralTheme}><Center padding={6}><Text color="secondary">Loading…</Text></Center></Theme>;
  }

  const path = currentPath(user !== null);

  if (path === '/welcome') {
    return <Theme theme={neutralTheme}><Landing /></Theme>;
  }
  if (path === '/login' || !user) {
    return <Theme theme={neutralTheme}><Login onAuthed={setUser} /></Theme>;
  }

  const signOut = () => {
    void api.logout().finally(() => setUser(null));
  };

  return (
    <Theme theme={neutralTheme}>
      <AppShell
        contentPadding={0}
        sideNav={
          <SideNav
            header={
              <SideNavHeading
                heading="Replyly"
                icon={<NavIcon icon={<Icon icon={BoltIcon} size="sm" />} />}
                headingHref="#/"
              />
            }>
            <SideNavSection title="Menu" isHeaderHidden>
              {(Object.keys(ROUTES) as RoutePath[]).map(p => (
                <SideNavItem
                  key={p}
                  label={ROUTES[p].label}
                  icon={ROUTES[p].icon}
                  href={`#${p}`}
                  isSelected={p === path}
                />
              ))}
            </SideNavSection>
            <SideNavSection title="Account" isHeaderHidden>
              <SideNavItem
                label="Sign out"
                icon={ArrowRightStartOnRectangleIcon}
                href="#/welcome"
                onClick={signOut}
              />
            </SideNavSection>
          </SideNav>
        }>
        {path === '/' ? <Dashboard user={user} /> : null}
        {path === '/inbox' ? <Inbox /> : null}
        {path === '/orders' ? <Orders /> : null}
        {path === '/catalogue' ? <Catalogue /> : null}
        {path === '/payments' ? <Payments /> : null}
      </AppShell>
    </Theme>
  );
}
