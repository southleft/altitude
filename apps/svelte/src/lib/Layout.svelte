<script>
// @ts-nocheck

  import '@southleft/al-web-components/components/avatar';
  import '@southleft/al-web-components/components/badge';
  import '@southleft/al-web-components/components/button';
  import '@southleft/al-web-components/components/card';
  import '@southleft/al-web-components/components/divider';
  import '@southleft/al-web-components/components/drawer';
  import '@southleft/al-web-components/components/header';
  import '@southleft/al-web-components/components/heading';
  import '@southleft/al-web-components/components/icon/icons/bell';
  import '@southleft/al-web-components/components/icon/icons/calendar';
  import '@southleft/al-web-components/components/icon/icons/list';
  import '@southleft/al-web-components/components/icon/icons/help';
  import '@southleft/al-web-components/components/icon/icons/settings';
  import '@southleft/al-web-components/components/icon/icons/support';
  import '@southleft/al-web-components/components/icon/icons/sign-out';
  import '@southleft/al-web-components/components/icon/icons/chevron-up';
  import '@southleft/al-web-components/components/icon/icons/home';
  import '@southleft/al-web-components/components/icon/icons/user';
  import '@southleft/al-web-components/components/layout';
  import '@southleft/al-web-components/components/list-item';
  import '@southleft/al-web-components/components/list';
  import '@southleft/al-web-components/components/logo';
  import '@southleft/al-web-components/components/menu-item';
  import '@southleft/al-web-components/components/menu';
  import '@southleft/al-web-components/components/popover';
  import '@southleft/al-web-components/components/search';
  import '@southleft/al-web-components/components/toggle-button';
  import '@southleft/al-web-components/components/theme-switcher';
  import './Layout.css';
  import { Link } from 'svelte-routing'

  let currentLogo;
  document.addEventListener('onThemeSwitcherChange', (event) => {
    currentLogo = event.detail.currentLogo;
  });
</script>

<main class="al-l-dashboard">
  <div class="al-l-dashboard__help-popover">
    <al-popover position="top-left" isDismissible={true}>
      <al-toggle-button slot="trigger" variant="background" data-testid="popover-trigger"><al-icon-help size="lg"></al-icon-help></al-toggle-button>
      <al-heading slot="header" tagName="h3" variant="sm">Help Center</al-heading>
      <p>Welcome to our Job Board Help Center! Whether you're a first-time user or seeking a refresher, this guide will walk you through the steps to navigate our platform with ease. Let's get started!</p>
      <p class="al-u-theme-typography-body-xs" slot="footer">1 of 4</p>
      <al-layout slot="footer" direction="row" justify="end" grow>
        <al-button variant="secondary">Learn more</al-button>
        <al-button>Next</al-button>
      </al-layout>
    </al-popover>
  </div>
  <al-layout variant="grid" gap="none" fullHeight noCollapse class="al-l-dashboard__shell">
    <div class="al-l-dashboard__sidebar">
    <al-layout direction="column" justify="between" fullHeight>
      <div class="al-l-dashboard__sidebar-logo">
      <al-layout direction="row" align="center">
        <al-logo variant={currentLogo !== 'altitude' ? currentLogo : null}>
          {currentLogo !== 'southleft' ? 'By Southleft • ' : ''}
          {'Svelte Web Application'}
        </al-logo>
      </al-layout>
      </div>
      <al-menu class="al-l-dashboard__sidebar-menu">
        <Link to="/dashboard" let:active>
          <al-menu-item isHeader={true} isSelected={active}>
            <al-icon-home slot="before"></al-icon-home>Dashboard<al-badge variant="danger">12</al-badge>
          </al-menu-item>
        </Link>
        <Link to="/" let:active class="al-l-dashboard__menu-link--header">
          <al-menu-item isHeader={true} isSelected={active}>
            <al-icon-list slot="before"></al-icon-list>Job Board
          </al-menu-item>
        </Link>
        <al-menu-item isHeader={true}>
          <al-icon-calendar slot="before"></al-icon-calendar>Schedule
        </al-menu-item>
        <al-menu-item isHeader={true} isExpandableHeader={true}>
          <al-icon-support slot="before"></al-icon-support>Resources
        </al-menu-item>
        <al-menu-item>Contact Us</al-menu-item>
        <al-menu-item>Customer Support</al-menu-item>
      </al-menu>
      <div class="al-l-dashboard__sidebar-user">
        <al-divider></al-divider>
        <al-popover position="top-right" variant="menu">
          <div slot="trigger" class="al-l-dashboard__user">
            <al-card variant="bare" layout="inline">
              <al-avatar slot="image">TP</al-avatar>
              <p>TJ Pitre</p>
              <al-button slot="actions-end" variant="bare" hideText={true}><al-icon-chevron-up slot="before"></al-icon-chevron-up></al-button>
            </al-card>
          </div>
          <al-menu>
            <al-menu-item><al-icon-user slot="before"></al-icon-user>Profile</al-menu-item>
            <al-menu-item><al-icon-settings slot="before"></al-icon-settings>Settings</al-menu-item>
            <al-menu-item><al-icon-support slot="before"></al-icon-support>Support</al-menu-item>
            <al-menu-item><al-icon-sign-out slot="before"></al-icon-sign-out>Sign Out</al-menu-item>
          </al-menu>
        </al-popover>
      </div>
    </al-layout>
    </div>
    <div class="al-l-dashboard__content">
      <al-header class="al-l-dashboard__header" sticky elevated>
        <al-layout direction="row" align="center" justify="between" gap="md">
        <al-search>
          <al-list>
            <al-list-item>Dashboard</al-list-item>
            <al-list-item>Job Board</al-list-item>
            <al-list-item>Schedule</al-list-item>
            <al-list-item>Resources</al-list-item>
          </al-list>
        </al-search>
        <al-layout direction="row" align="center" gap="sm">
        <al-theme-switcher></al-theme-switcher>
        <al-drawer alignment="right" hasBackdrop={true} width="400">
          <al-button slot="trigger" hideText={true} variant="bare"><al-badge variant="danger" slot="after" isDot={true} class="al-l-dashboard__notifications-badge"></al-badge><al-icon-bell slot="after"></al-icon-bell></al-button>
          <al-heading slot="header" tagName="h3" variant="sm" isBold={true}>Notifications</al-heading>
          <al-layout direction="column" gap="sm">
            <al-card variant="bare" layout="inline">
              <al-avatar slot="image" hasBadge={true} badgeVariant="success">KP</al-avatar>
              <p class="al-u-theme-typography-body-sm"><strong>&#64;kploransky</strong> sent you a message</p>
              <p class="al-u-theme-typography-body-xs">Thursday 4:20pm</p>
              <al-badge slot="actions-start" variant="warning" isDot={true}></al-badge>
              <p slot="actions-end" class="al-u-theme-typography-body-xs">2 hours ago</p>
            </al-card>
            <al-divider></al-divider>
            <al-card variant="bare" layout="inline">
              <al-avatar slot="image">EB</al-avatar>
              <p class="al-u-theme-typography-body-sm"><strong>&#64;ebrown</strong> sent you a message</p>
              <p class="al-u-theme-typography-body-xs">Thursday 5:14pm</p>
              <al-badge slot="actions-start" variant="warning" isDot={true}></al-badge>
              <p slot="actions-end" class="al-u-theme-typography-body-xs">3 hours ago</p>
            </al-card>
            <al-divider></al-divider>
            <al-card variant="bare" layout="inline">
              <al-avatar slot="image">BV</al-avatar>
              <p class="al-u-theme-typography-body-sm"><strong>&#64;bvoran</strong> invited you to a <strong>Design Systems Workshop</strong></p>
              <p class="al-u-theme-typography-body-xs">Wednesday 6:32pm</p>
              <p slot="actions-end" class="al-u-theme-typography-body-xs">1 day ago</p>
            </al-card>
          </al-layout>
          <al-button slot="footer">Mark all as read</al-button>
        </al-drawer>
        <al-popover variant="menu">
          <al-avatar slot="trigger">TP</al-avatar>
          <al-menu>
            <al-menu-item><al-icon-user></al-icon-user>Profile</al-menu-item>
            <al-menu-item><al-icon-settings></al-icon-settings>Settings</al-menu-item>
            <al-menu-item><al-icon-support></al-icon-support>Support</al-menu-item>
            <al-menu-item><al-icon-sign-out></al-icon-sign-out>Sign Out</al-menu-item>
          </al-menu>
        </al-popover>
        </al-layout>
        </al-layout>
      </al-header>
      <div class="al-l-dashboard__body">
      <al-layout variant="constrained" size="xl" gutter="sm">
        <slot></slot>
      </al-layout>
      </div>
    </div>
  </al-layout>
</main>
