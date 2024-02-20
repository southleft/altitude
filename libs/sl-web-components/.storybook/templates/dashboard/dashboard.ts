import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import styles from './dashboard.scss';
import '../../../components/avatar/avatar';
import '../../../components/badge/badge';
import '../../../components/divider/divider';
import '../../../components/drawer/drawer';
import '../../../components/header/header';
import '../../../components/heading/heading';
import '../../../components/icon/icons/bell';
import '../../../components/icon/icons/calendar';
import '../../../components/icon/icons/chevron-up';
import '../../../components/icon/icons/help';
import '../../../components/icon/icons/home';
import '../../../components/icon/icons/list';
import '../../../components/icon/icons/settings';
import '../../../components/icon/icons/sign-out';
import '../../../components/icon/icons/support';
import '../../../components/icon/icons/user';
import '../../../components/layout-container/layout-container';
import '../../../components/layout-section/layout-section';
import '../../../components/layout/layout';
import '../../../components/list-item/list-item';
import '../../../components/list/list';
import '../../../components/menu-item/menu-item';
import '../../../components/menu/menu';
import '../../../components/popover/popover';
import '../../../components/search/search';
import '../../../components/toggle-button/toggle-button';
import '../../../components/toggle/toggle';

/**
 * Page: sl-l-dashboard
 * @slot - The templates content
 */
export class SLDashboard extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @property()
  accessor styleModifier: string;

  firstUpdated() {
    const storyId = new URLSearchParams(window.location.search).get('id');
    const menuItems = this.shadowRoot.querySelectorAll('.sl-l-dashboard__sidebar-menu > *');
    menuItems.forEach((item) => {
      if (item.getAttribute('href') === `/?path=/story/${storyId}`) {
        item.setAttribute('isSelected', 'true');
      }
    });
  }

  render() {
    const componentClassNames = classMap({
      'sl-l-dashboard': true,
      [this.styleModifier]: !!this.styleModifier
    });

    return html`
      <main class=${componentClassNames}>
        <div class="sl-l-dashboard__help-popover">
          <sl-popover position="top-left" ?isDismissible=${true}>
            <sl-toggle-button slot="trigger" variant="background" data-testid="popover-trigger"><sl-icon-help size="lg"></sl-icon-help></sl-toggle-button>
            <sl-heading slot="header" tagName="h3" variant="sm">Help Center</sl-heading>
            <p>Welcome to our Job Board Help Center! Whether you're a first-time user or seeking a refresher, this guide will walk you through the steps to navigate our platform with ease. Let's get started!</p>
            <p class="sl-u-theme-typography-body-xs" slot="footer">1 of 4</p>
            <sl-button-group slot="footer" alignment="right">
              <sl-button variant="secondary">Learn more</sl-button>
              <sl-button>Next</sl-button>
            </sl-button-group>
          </sl-popover>
        </div>
        <sl-layout variant="sidebar-left" gap="none">
          <div class="sl-l-dashboard__sidebar">
            <slot name="sidebar">
              <div class="sl-l-dashboard__sidebar-logo">
                <a href="/?path=/story/pages-home--default"><img src="images/logo.svg" alt="logo" /></a>
                <sl-divider></sl-divider>
              </div>
              <sl-menu class="sl-l-dashboard__sidebar-menu">
                <sl-menu-item href="/?path=/story/pages-home--default" ?isHeader=${true}><sl-icon-home></sl-icon-home>Dashboard<sl-badge variant="danger">12</sl-badge></sl-badge></sl-menu-item>
                <sl-menu-item href="/?path=/story/pages-job-board--default" ?isHeader=${true}><sl-icon-list></sl-icon-list>Job Board</sl-menu-item>
                <sl-menu-item ?isHeader=${true}><sl-icon-calendar></sl-icon-calendar>Schedule</sl-menu-item>
                <sl-menu-item ?isHeader=${true} ?isExpandableHeader=${true}><sl-icon-support></sl-icon-support>Resources</sl-menu-item>
                <sl-menu-item>Contact Us</sl-menu-item>
                <sl-menu-item>Customer Support</sl-menu-item>
              </sl-menu>
              <div class="sl-l-dashboard__sidebar-user">
                <sl-divider></sl-divider>
                <sl-popover position="top-right" variant="menu">
                  <div slot="trigger" class="sl-l-dashboard__user">
                    <sl-avatar>TP</sl-avatar>
                    <p>TJ Pitre</p>
                    <sl-button variant="tertiary" ?hideText=${true}><sl-icon-chevron-up slot="before"></sl-icon-chevron-down></sl-button>
                  </div>
                  <sl-menu>
                    <sl-menu-item><sl-icon-user></sl-icon-user>Profile</sl-menu-item>
                    <sl-menu-item><sl-icon-settings></sl-icon-settings>Settings</sl-menu-item>
                    <sl-menu-item><sl-icon-support></sl-icon-support>Support</sl-menu-item>
                    <sl-menu-item><sl-icon-sign-out></sl-icon-sign-out>Sign Out</sl-menu-item>
                  </sl-menu>
                </sl-popover>
              </div>
            </slot>
          </div>
          <div class="sl-l-dashboard__content">
            <sl-header class="sl-l-dashboard__header">
              <sl-search slot="before">
                <sl-list>
                  <sl-list-item>Dashboard</sl-list-item>
                  <sl-list-item>Job Board</sl-list-item>
                  <sl-list-item>Schedule</sl-list-item>
                  <sl-list-item>Resources</sl-list-item>
                </sl-list>
              </sl-search>
              <div slot="after">
                <sl-drawer alignment="right" ?hasBackdrop=${true} width="400">
                  <sl-button slot="trigger" ?hideText=${true} variant="tertiary"><sl-badge variant="danger" slot="after" ?isDot=${true} class="sl-l-dashboard__notifications-badge"></sl-badge><sl-icon-bell slot="after"></sl-icon-bell></sl-button>
                  <sl-heading slot="header" tagName="h3" variant="sm" ?isBold=${true}>Notifications</sl-heading>
                  <div class="sl-u-gap-xs">
                    <sl-card variant="bare" layout="inline" href="#">
                      <sl-avatar slot="image" ?hasBadge=${true} badgeVariant="success">KP</sl-avatar>
                      <p class="sl-u-theme-typography-body-sm"><strong>@kploransky</strong> sent you a message</p>
                      <p class="sl-u-theme-typography-body-xs">Thursday 4:20pm</p>
                      <sl-badge slot="actions-start" variant="warning" ?isDot=${true}></sl-badge>
                      <p slot="actions-end" class="sl-u-theme-typography-body-xs">2 hours ago</p>
                    </sl-card>
                    <sl-divider></sl-divider>
                    <sl-card variant="bare" layout="inline" href="#">
                      <sl-avatar slot="image">EB</sl-avatar>
                      <p class="sl-u-theme-typography-body-sm"><strong>@ebrown</strong> sent you a message</p>
                      <p class="sl-u-theme-typography-body-xs">Thursday 5:14pm</p>
                      <sl-badge slot="actions-start" variant="warning" ?isDot=${true}></sl-badge>
                      <p slot="actions-end" class="sl-u-theme-typography-body-xs">3 hours ago</p>
                    </sl-card>
                    <sl-divider></sl-divider>
                    <sl-card variant="bare" layout="inline" href="#">
                      <sl-avatar slot="image">BV</sl-avatar>
                      <p class="sl-u-theme-typography-body-sm"><strong>@bvoran</strong> invited you to a <strong>Design Systems Workshop</strong></p>
                      <p class="sl-u-theme-typography-body-xs">Wednesday 6:32pm</p>
                      <p slot="actions-end" class="sl-u-theme-typography-body-xs">1 day ago</p>
                    </sl-card>
                  </div>
                  <sl-button slot="footer">Mark all as read</sl-button>
                </sl-drawer>
              </div>
              <div slot="after">
                <sl-popover variant="menu">
                  <sl-avatar slot="trigger">TP</sl-avatar>
                  <sl-menu>
                    <sl-menu-item><sl-icon-user></sl-icon-user>Profile</sl-menu-item>
                    <sl-menu-item><sl-icon-settings></sl-icon-settings>Settings</sl-menu-item>
                    <sl-menu-item><sl-icon-support></sl-icon-support>Support</sl-menu-item>
                    <sl-menu-item><sl-icon-sign-out></sl-icon-sign-out>Sign Out</sl-menu-item>
                  </sl-menu>
                </sl-popover>
              </div>
            </sl-header>
            <sl-layout-container class="sl-l-dashboard__body">
              <slot>
                <f-po>Body content</f-po>
              </slot>
            </sl-layout-container>
          </div>
        </sl-layout>
      </main>
    `;
  }
}

if (customElements.get('sl-dashboard') === undefined) {
  customElements.define('sl-dashboard', SLDashboard);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-dashboard': SLDashboard;
  }
}
