<script>
// @ts-nocheck

  import 'al-web-components/dist/components/avatar/avatar';
  import 'al-web-components/dist/components/badge/badge';
  import 'al-web-components/dist/components/breadcrumbs-item/breadcrumbs-item';
  import 'al-web-components/dist/components/breadcrumbs/breadcrumbs';
  import 'al-web-components/dist/components/button-group/button-group';
  import 'al-web-components/dist/components/button/button';
  import 'al-web-components/dist/components/card/card';
  import 'al-web-components/dist/components/chip/chip';
  import 'al-web-components/dist/components/drawer/drawer';
  import 'al-web-components/dist/components/header/header';
  import 'al-web-components/dist/components/heading/heading';
  import 'al-web-components/dist/components/icon/icons/bell';
  import 'al-web-components/dist/components/icon/icons/document';
  import 'al-web-components/dist/components/icon/icons/dots-vertical';
  import 'al-web-components/dist/components/icon/icons/help';
  import 'al-web-components/dist/components/icon/icons/menu';
  import 'al-web-components/dist/components/layout-container/layout-container';
  import 'al-web-components/dist/components/layout-section/layout-section';
  import 'al-web-components/dist/components/layout/layout';
  import 'al-web-components/dist/components/list-item/list-item';
  import 'al-web-components/dist/components/list/list';
  import 'al-web-components/dist/components/menu-item/menu-item';
  import 'al-web-components/dist/components/menu/menu';
  import 'al-web-components/dist/components/popover/popover';
  import 'al-web-components/dist/components/search/search';
  import 'al-web-components/dist/components/text-passage/text-passage';
  import 'al-web-components/dist/components/toggle-button/toggle-button';
  import './Layout.css';
  import logo from '../assets/logo.svg'
  import { Link } from 'svelte-routing'
</script>

<main style="position: relative; display: block;">
  <div class="al-l-dashboard__help-popover">
    <al-popover position="top-left" isDismissible="true">
      <al-toggle-button slot="trigger" variant="background" data-testid="popover-trigger"><al-icon-help size="lg"></al-icon-help></al-toggle-button>
      <al-heading slot="header" tagName="h3" variant="sm">Help Center</al-heading>
      <p>Welcome to our Job Board Help Center! Whether you're a first-time user or seeking a refresher, this guide will walk you through the steps to navigate our platform with ease. Let's get started!</p>
      <p class="al-u-theme-typography-body-xs" slot="footer">1 of 4</p>
      <al-button-group slot="footer" alignment="right">
        <al-button variant="secondary">Learn more</al-button>
        <al-button>Next</al-button>
      </al-button-group>
    </al-popover>
  </div>
  <al-layout variant="sidebar-left" gap="none">
    <div class="al-l-dashboard__sidebar">
      <div class="al-l-dashboard__sidebar-logo">
        <Link to="/"><img src={logo} alt="logo" /></Link>
        <al-divider></al-divider>
      </div>
      <al-menu class="al-l-dashboard__sidebar-menu">
        <Link to="/dashboard" let:active>
          <al-menu-item isHeader="true" isSelected={active}>
            <al-icon-home slot="before"></al-icon-home>Dashboard<al-badge variant="danger">12</al-badge>
          </al-menu-item>
        </Link>
        <Link to="/" let:active class="al-l-dashboard__menu-link--header">
          <al-menu-item isHeader="true" isSelected={active}>
            <al-icon-list slot="before"></al-icon-list>Job Board
          </al-menu-item>
        </Link>
        <al-menu-item isHeader="true">
          <al-icon-calendar slot="before"></al-icon-calendar>Schedule
        </al-menu-item>
        <al-menu-item isHeader="true" isExpandableHeader="true">
          <al-icon-support slot="before"></al-icon-support>Resources
        </al-menu-item>
        <al-menu-item>Contact Us</al-menu-item>
        <al-menu-item>Customer Support</al-menu-item>
      </al-menu>
      <div class="al-l-dashboard__sidebar-user">
        <al-divider></al-divider>
        <al-popover position="top-right" variant="menu">
          <div slot="trigger" class="al-l-dashboard__user">
            <al-avatar>TP</al-avatar>
            <p>TJ Pitre</p>
            <al-button variant="tertiary" hideText="true"><al-icon-chevron-up slot="before"></al-icon-chevron-up></al-button>
          </div>
          <al-menu>
            <al-menu-item><al-icon-user></al-icon-user>Profile</al-menu-item>
            <al-menu-item><al-icon-settings></al-icon-settings>Settings</al-menu-item>
            <al-menu-item><al-icon-support></al-icon-support>Support</al-menu-item>
            <al-menu-item><al-icon-sign-out></al-icon-sign-out>Sign Out</al-menu-item>
          </al-menu>
        </al-popover>
      </div>
    </div>
    <div class="al-l-dashboard__content">
      <al-header class="al-l-dashboard__header">
        <al-search slot="before">
          <al-list>
            <al-list-item>Dashboard</al-list-item>
            <al-list-item>Job Board</al-list-item>
            <al-list-item>Schedule</al-list-item>
            <al-list-item>Resources</al-list-item>
          </al-list>
        </al-search>
        <div slot="after">
          <al-drawer alignment="right" hasBackdrop="true" width="400">
            <al-button slot="trigger" hideText="true" variant="tertiary"><al-badge variant="danger" slot="after" isDot="true" class="al-l-dashboard__notifications-badge"></al-badge><al-icon-bell slot="after"></al-icon-bell></al-button>
            <al-heading slot="header" tagName="h3" variant="sm" isBold="true">Notifications</al-heading>
            <div class="al-u-gap-xs">
              <al-card variant="bare" layout="inline" href="#">
                <al-avatar slot="image" hasBadge="true" badgeVariant="success">KP</al-avatar>
                <p class="al-u-theme-typography-body-sm"><strong>&#64;kploransky</strong> sent you a message</p>
                <p class="al-u-theme-typography-body-xs">Thursday 4:20pm</p>
                <al-badge slot="actions-start" variant="warning" isDot="true"></al-badge>
                <p slot="actions-end" class="al-u-theme-typography-body-xs">2 hours ago</p>
              </al-card>
              <al-divider></al-divider>
              <al-card variant="bare" layout="inline" href="#">
                <al-avatar slot="image">EB</al-avatar>
                <p class="al-u-theme-typography-body-sm"><strong>&#64;ebrown</strong> sent you a message</p>
                <p class="al-u-theme-typography-body-xs">Thursday 5:14pm</p>
                <al-badge slot="actions-start" variant="warning" isDot="true"></al-badge>
                <p slot="actions-end" class="al-u-theme-typography-body-xs">3 hours ago</p>
              </al-card>
              <al-divider></al-divider>
              <al-card variant="bare" layout="inline" href="#">
                <al-avatar slot="image">BV</al-avatar>
                <p class="al-u-theme-typography-body-sm"><strong>&#64;bvoran</strong> invited you to a <strong>Design Systems Workshop</strong></p>
                <p class="al-u-theme-typography-body-xs">Wednesday 6:32pm</p>
                <p slot="actions-end" class="al-u-theme-typography-body-xs">1 day ago</p>
              </al-card>
            </div>
            <al-button slot="footer">Mark all as read</al-button>
          </al-drawer>
        </div>
        <div slot="after">
          <al-popover variant="menu">
            <al-avatar slot="trigger">TP</al-avatar>
            <al-menu>
              <al-menu-item><al-icon-user></al-icon-user>Profile</al-menu-item>
              <al-menu-item><al-icon-settings></al-icon-settings>Settings</al-menu-item>
              <al-menu-item><al-icon-support></al-icon-support>Support</al-menu-item>
              <al-menu-item><al-icon-sign-out></al-icon-sign-out>Sign Out</al-menu-item>
            </al-menu>
          </al-popover>
        </div>
      </al-header>
      <al-layout-container class="al-l-dashboard__body">
        <slot></slot>
      </al-layout-container>
    </div>
  </al-layout>
</main>
