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
import '../../../components/logo/logo';
import '../../../components/menu-item/menu-item';
import '../../../components/menu/menu';
import '../../../components/popover/popover';
import '../../../components/search/search';
import '../../../components/toggle-button/toggle-button';
import '../../../components/toggle/toggle';
import '../../../components/theme-switcher/theme-switcher';

/**
 * Page: al-l-dashboard
 */
export class ALDashboard extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @property()
  accessor styleModifier: string;

  @property()
  accessor currentTheme: string;

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('onThemeSwitcherChange', (event) => {
      const target = event as CustomEvent;
      this.currentTheme = target.detail.currentTheme;
    });
  }

  firstUpdated() {
    const storyId = new URLSearchParams(window.location.search).get('id');
    const menuItems = this.shadowRoot.querySelectorAll('.al-l-dashboard__sidebar-menu > *');
    menuItems.forEach((item) => {
      if (item.getAttribute('href') === `/?path=/story/${storyId}`) {
        item.setAttribute('isSelected', 'true');
      }
    });
  }

  render() {
    const componentClassNames = classMap({
      'al-l-dashboard': true,
      [this.styleModifier]: !!this.styleModifier
    });

    return html`
      <main class=${componentClassNames}>
        <div class="al-l-dashboard__help-popover">
          <al-popover position="top-left" ?isDismissible=${true}>
            <al-toggle-button slot="trigger" variant="background" data-testid="popover-trigger"><al-icon-help size="lg"></al-icon-help></al-toggle-button>
            <al-heading slot="header" tagName="h3" variant="sm">Help Center</al-heading>
            <p>Welcome to our Job Board Help Center! Whether you're a first-time user or seeking a refresher, this guide will walk you through the steps to navigate our platform with ease. Let's get started!</p>
            <p class="al-u-theme-typography-body-xs" slot="footer">1 of 4</p>
            <al-button-group slot="footer" alignment="right">
              <al-button variant="tertiary">Learn more</al-button>
              <al-button>Next</al-button>
            </al-button-group>
          </al-popover>
        </div>
        <al-layout variant="sidebar-left" gap="none">
          <div class="al-l-dashboard__sidebar">
            <slot name="sidebar">
              <div class="al-l-dashboard__sidebar-logo">
                <al-logo href="/?path=/story/pages-home--default" variant="${this.currentTheme !== 'altitude' ? this.currentTheme : null}">
                  ${this.currentTheme !== 'southleft' ? html`By Southleft` : html``}
                </al-logo>
              </div>
              <al-menu class="al-l-dashboard__sidebar-menu">
                <al-menu-item href="/?path=/story/pages-home--default" ?isHeader=${true}><al-icon-home slot="before"></al-icon-home>Dashboard<al-badge variant="danger">12</al-badge></al-badge></al-menu-item>
                <al-menu-item href="/?path=/story/pages-job-board--default" ?isHeader=${true}><al-icon-list slot="before"></al-icon-list>Job Board</al-menu-item>
                <al-menu-item ?isHeader=${true}><al-icon-calendar></al-icon-calendar slot="before">Schedule</al-menu-item>
                <al-menu-item ?isHeader=${true} ?isExpandableHeader=${true}><al-icon-support slot="before"></al-icon-support>Resources</al-menu-item>
                <al-menu-item>Contact Us</al-menu-item>
                <al-menu-item>Customer Support</al-menu-item>
              </al-menu>
              <div class="al-l-dashboard__sidebar-user">
                <al-divider></al-divider>
                <al-popover position="top-right" variant="menu">
                  <div slot="trigger" class="al-l-dashboard__user">
                    <al-avatar>TP</al-avatar>
                    <p>TJ Pitre</p>
                    <al-button variant="bare" ?hideText=${true}><al-icon-chevron-up slot="before"></al-icon-chevron-down></al-button>
                  </div>
                  <al-menu>
                    <al-menu-item><al-icon-user></al-icon-user>Profile</al-menu-item>
                    <al-menu-item><al-icon-settings></al-icon-settings>Settings</al-menu-item>
                    <al-menu-item><al-icon-support></al-icon-support>Support</al-menu-item>
                    <al-menu-item><al-icon-sign-out></al-icon-sign-out>Sign Out</al-menu-item>
                  </al-menu>
                </al-popover>
              </div>
            </slot>
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
                <al-theme-switcher></al-theme-switcher>
              </div>
              <div slot="after">
                <al-drawer alignment="right" ?hasBackdrop=${true} width="400">
                  <al-button slot="trigger" ?hideText=${true} variant="bare"><al-badge variant="danger" slot="after" ?isDot=${true} class="al-l-dashboard__notifications-badge"></al-badge><al-icon-bell slot="after"></al-icon-bell></al-button>
                  <al-heading slot="header" tagName="h3" variant="sm" ?isBold=${true}>Notifications</al-heading>
                  <div class="al-u-gap-xs">
                    <al-card variant="bare" layout="inline" href="#">
                      <al-avatar slot="image" ?hasBadge=${true} badgeVariant="success">KP</al-avatar>
                      <p class="al-u-theme-typography-body-sm"><strong>@kploransky</strong> sent you a message</p>
                      <p class="al-u-theme-typography-body-xs">Thursday 4:20pm</p>
                      <al-badge slot="actions-start" variant="warning" ?isDot=${true}></al-badge>
                      <p slot="actions-end" class="al-u-theme-typography-body-xs">2 hours ago</p>
                    </al-card>
                    <al-divider></al-divider>
                    <al-card variant="bare" layout="inline" href="#">
                      <al-avatar slot="image">EB</al-avatar>
                      <p class="al-u-theme-typography-body-sm"><strong>@ebrown</strong> sent you a message</p>
                      <p class="al-u-theme-typography-body-xs">Thursday 5:14pm</p>
                      <al-badge slot="actions-start" variant="warning" ?isDot=${true}></al-badge>
                      <p slot="actions-end" class="al-u-theme-typography-body-xs">3 hours ago</p>
                    </al-card>
                    <al-divider></al-divider>
                    <al-card variant="bare" layout="inline" href="#">
                      <al-avatar slot="image">BV</al-avatar>
                      <p class="al-u-theme-typography-body-sm"><strong>@bvoran</strong> invited you to a <strong>Design Systems Workshop</strong></p>
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
              <slot>
                <f-po>Body content</f-po>
              </slot>
            </al-layout-container>
          </div>
        </al-layout>
      </main>
    `;
  }
}

if (customElements.get('al-dashboard') === undefined) {
  customElements.define('al-dashboard', ALDashboard);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-dashboard': ALDashboard;
  }
}
