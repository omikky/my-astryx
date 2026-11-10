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
import {hasSession, signOut} from './session';

const ROUTES = {
  '/': {label: 'Dashboard', icon: ChartBarSquareIcon, view: Dashboard},
  '/inbox': {label: 'Inbox', icon: ChatBubbleLeftRightIcon, view: Inbox},
  '/orders': {label: 'Orders', icon: ShoppingBagIcon, view: Orders},
  '/catalogue': {label: 'Catalogue', icon: TagIcon, view: Catalogue},
  '/payments': {label: 'Payments', icon: CreditCardIcon, view: Payments},
} as const;

type RoutePath = keyof typeof ROUTES;
type PublicPath = '/welcome' | '/login';

function currentPath(): RoutePath | PublicPath {
  const path = window.location.hash.replace(/^#/, '') || '/';
  if (path === '/welcome' || path === '/login') {
    return path;
  }
  if (!hasSession()) {
    return '/welcome';
  }
  return path in ROUTES ? (path as RoutePath) : '/';
}

export default function App() {
  const [path, setPath] = useState<RoutePath | PublicPath>(currentPath);

  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  if (path === '/welcome') {
    return (
      <Theme theme={neutralTheme}>
        <Landing />
      </Theme>
    );
  }
  if (path === '/login') {
    return (
      <Theme theme={neutralTheme}>
        <Login />
      </Theme>
    );
  }

  const View = ROUTES[path].view;

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
        <View />
      </AppShell>
    </Theme>
  );
}
