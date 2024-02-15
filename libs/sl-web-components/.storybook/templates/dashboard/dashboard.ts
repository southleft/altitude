import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import styles from './dashboard.scss';
import * as Popover from '../../../components/popover/popover.stories.ts';
import '../../../components/avatar/avatar';
import '../../../components/badge/badge';
import '../../../components/divider/divider';
import '../../../components/drawer/drawer';
import '../../../components/header/header';
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
import '../../../components/search/search';
import '../../../components/toggle/toggle';
import '../../../components/toggle-button/toggle-button';

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
        ${Popover.WithContent({position: 'top-left'})}
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
                <sl-drawer alignment="right" ?hasBackdrop=${true}>
                  <sl-button slot="trigger" ?hideText=${true} variant="tertiary"><sl-icon-settings slot="after"></sl-icon-settings></sl-button>
                  <div slot="header">Settings</div>
                  <div>Coming Soon</div>
                  <div slot="footer"><sl-button>Save Changes</sl-button></div>
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
