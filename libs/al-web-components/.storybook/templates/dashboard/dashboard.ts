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
 * Page: al-l-dashboard
 */
export class ALDashboard extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @property()
  accessor styleModifier: string;

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
              <al-button variant="secondary">Learn more</al-button>
              <al-button>Next</al-button>
            </al-button-group>
          </al-popover>
        </div>
        <al-layout variant="sidebar-left" gap="none">
          <div class="al-l-dashboard__sidebar">
            <slot name="sidebar">
              <div class="al-l-dashboard__sidebar-logo">
                <a href="/?path=/story/pages-home--default">
                  <svg style="max-width:200px" viewBox="0 0 1056.7 220.5" xmlns=http://www.w3.org/2000/svg><path d=M111.5,100.5l-56-29.4L0,100v29.3l55.5-29.6,56,29.9v-29.1ZM111.5,29.4L55.5,0,0,28.9v29.3l55.5-29.6,56,29.9v-29.1Z fill=var(--al-theme-color-background-accent-default) stroke-width=0 /><path d=M487.4,2.7l9.2,32.7-.3.2c-8.4-7.6-16.4-9-27.7-9h-10.5l.2,88.2c0,8.4,3.7,12.5,9.2,15v.3h-44.6v-.3c5.5-2.3,9.2-6.6,9.2-15V26.6h-10.4c-11.3,0-19.4,1.5-27.7,9l-.3-.2,8.9-32.7h84.8ZM284.2,129.7v.3h-34l-8.2-26.2-2.4-7-20.9,11-21.2-11.2-2.4,7.2-8.8,26.2h-33v-.3c3.5-1.5,6.3-3.8,7.9-7.5l37.4-104.7c1.8-6.5.2-12.4-4.7-14.4v-.3h50s0,.4,0,.3c-4.7,2-6.4,7.5-4.9,13.7l37.3,105.4c1.5,3.6,4.3,6,7.9,7.5h0ZM231.9,73.7l-13.3-41.9-13.7,41.7,13.7,7.3,13.3-7.1ZM364.7,106.1h-28.9V18c0-8.4,3.7-12.7,9.2-15v-.3h-44.6v.3c5.5,2.4,9.2,6.6,9.2,15v96.7c0,8.4-3.7,12.7-9.2,15v.3h83.3l9.2-32.9-.5-.3c-8.3,8.1-16.9,9.3-27.7,9.3ZM544.3,114.7l-.2-96.7c0-8.4,3.7-12.7,9.2-15v-.3h-44.6v.3c5.5,2.4,9.2,6.6,9.2,15v33.5l.2,26.9v36.4c0,8.4-3.7,12.7-9.2,15v.3h44.6v-.3c-5.6-2.4-9.2-6.7-9.2-15.1ZM1056.1,96.7c-8.3,7.6-16.4,9.3-27.7,9.3h-34.5v-29h26c8.7,0,12.8,3.8,15.4,9.5h.3v-42.6h-.3c-2.6,5.7-6.7,9.5-15.4,9.5h-26v-26.9h32.6c11.3,0,19.3,1.7,27.5,9.5l.3-.3-8.3-32.9h-87.7v.3c5.5,2.4,9.2,6.6,9.2,15v96.7c0,8.4-3.7,12.7-9.2,15v.3h89.7l8.7-32.7-.6-.7ZM935,42.2c1.6,7.4,2.4,14.4,2.4,21.1,0,16.9-3.4,31.3-10.2,43-9.2,15.8-23.4,23.7-42.7,23.7h-64.1v-.3c5.3-2.2,8.9-6.3,9.2-14.1V16.2c-.5-7.2-4.1-11-9.2-13.1v-.3h64c7.9.1,14.5,1,19.7,2.8,8.9,2.9,16.1,8.3,21.7,16.2,4.5,6.1,7.6,13,9.2,20.4h0ZM910.4,65c0-13-2-22.9-6-29.9-4.1-6.9-12.2-10.4-24.3-10.4h-24.5v83.1h24.5c12.6,0,21.3-6.2,26.3-18.6,2.6-6.7,4-14.8,4-24.2h0ZM576.4,2.7l-8.9,32.7.3.2c8.3-7.5,16.4-9,27.7-9h10.2v88.2c0,8.4-3.7,12.7-9.2,15v.3h44.6v-.3c-5.3-2.4-9-6.6-9-15l-.2-88.2h10.4c11.3,0,19.3,1.4,27.7,9l.3-.2-9-32.7h-84.9ZM756.7,3c5.3,2.4,9,6.6,9,15v64.3c0,15.6-9.9,24-21.4,24s-21.4-8.4-21.4-24V18c0-8.4,3.7-12.7,9.2-15v-.3h-44.6v.3c5.5,2.4,9.2,6.6,9.2,15v65.7c0,29.5,21.1,48.6,47.7,48.6s47.8-19.1,47.8-48.6V18c0-8.4,3.7-12.7,9.2-15v-.3h-44.6v.3h-.1Z fill=var(--al-theme-color-content-default) stroke-width=0 /><path d="M158.4,171.8h16.2c3.7,0,6.5,0.9,8.6,2.6c2.1,1.7,3.1,4.2,3.1,7.3c0,2-0.5,3.7-1.6,5.1s-2.5,2.4-4.3,2.9v0.1c2.1,0.5,3.8,1.5,5,3c1.2,1.5,1.8,3.4,1.8,5.8c0,3.2-1.1,5.7-3.2,7.5c-2.1,1.8-5.2,2.7-9.1,2.7h-16.5L158.4,171.8L158.4,171.8zM173.5,187.2c1.7,0,3-0.4,3.9-1.3s1.4-2,1.4-3.5s-0.5-2.7-1.4-3.5c-0.9-0.9-2.2-1.3-3.9-1.3H166v9.6L173.5,187.2L173.5,187.2zM173.5,202.9c1.9,0,3.4-0.4,4.5-1.4c1.1-0.9,1.6-2.2,1.6-3.8s-0.6-2.9-1.6-3.8c-1.1-0.9-2.6-1.4-4.5-1.4H166v10.3L173.5,202.9L173.5,202.9z M198.6,219.1c-2.1-0.9-3.8-2.2-5.1-3.9l3.5-4.6c0.9,1.3,2.1,2.3,3.5,3.1c1.4,0.7,2.9,1.1,4.6,1.1c2.2,0,4-0.7,5.3-2s1.9-3.1,1.9-5.5v-1.9h-0.1c-0.8,1.5-1.8,2.6-3.1,3.4c-1.3,0.8-2.7,1.2-4.2,1.2c-2.7,0-4.9-0.9-6.5-2.6c-1.6-1.8-2.4-4.2-2.4-7.2v-18h6.8v17.3c0,1.5,0.4,2.7,1.1,3.6s1.8,1.4,3.2,1.4c1.5,0,2.7-0.5,3.6-1.5s1.4-2.3,1.4-3.9v-16.8h6.8l0.1,25.4c0,4-1.2,7.2-3.6,9.5c-2.4,2.3-5.7,3.4-9.9,3.4C203.1,220.5,200.7,220,198.6,219.1L198.6,219.1z M251.3,208.3c-2.2-1-4-2.5-5.3-4.4s-2-4.2-2.1-6.7l7.1-1.2c0.1,2.4,0.9,4.3,2.4,5.8c1.5,1.5,3.5,2.2,5.8,2.2c1.9,0,3.5-0.5,4.6-1.4s1.7-2.2,1.7-3.6c0-1.2-0.4-2.2-1.3-2.9s-2.2-1.4-4.2-2l-5.1-1.5c-3.4-0.9-5.9-2.2-7.4-3.9c-1.5-1.7-2.3-3.9-2.3-6.6c0-2.2,0.5-4.2,1.5-5.9c1-1.7,2.5-3,4.4-4c1.9-0.9,4.2-1.4,6.8-1.4c2.4,0,4.5,0.4,6.4,1.4c1.9,0.9,3.4,2.2,4.5,3.8c1.1,1.6,1.8,3.5,1.9,5.7L264,183c-0.1-1.9-0.7-3.4-1.8-4.6c-1.1-1.2-2.5-1.8-4.2-1.8s-2.9,0.4-3.9,1.3c-1,0.9-1.5,2-1.5,3.4c0,1.2,0.4,2.2,1.2,3s2.1,1.4,3.9,1.9l5,1.4c3.5,0.9,6.1,2.2,7.7,3.9s2.4,3.9,2.4,6.7c0,2.3-0.6,4.3-1.7,6.1c-1.1,1.8-2.8,3.1-4.9,4.1c-2.1,1-4.6,1.5-7.4,1.5S253.5,209.3,251.3,208.3L251.3,208.3z M287,207.8c-2-1.2-3.5-2.8-4.6-5c-1.1-2.1-1.6-4.6-1.6-7.5s0.5-5.3,1.6-7.4c1.1-2.1,2.6-3.8,4.6-4.9c2-1.2,4.3-1.7,6.9-1.7s4.9,0.6,6.9,1.7s3.5,2.8,4.6,4.9c1.1,2.1,1.6,4.6,1.6,7.4s-0.5,5.3-1.6,7.5c-1.1,2.1-2.6,3.8-4.6,5s-4.3,1.7-6.9,1.7S289,209,287,207.8z M298.6,201.5c1.1-1.5,1.7-3.5,1.7-6.1s-0.6-4.5-1.7-6s-2.7-2.2-4.6-2.2s-3.5,0.8-4.6,2.2s-1.7,3.5-1.7,6s0.6,4.6,1.7,6.1s2.7,2.3,4.6,2.3S297.4,203,298.6,201.5z M318.1,207.2c-1.4-1.5-2.1-3.6-2.1-6.3v-18.7h6.8v17.4c0,1.4,0.4,2.4,1.1,3.2c0.7,0.8,1.7,1.1,2.9,1.1c1.6,0,2.9-0.5,3.9-1.6s1.5-2.5,1.5-4.3v-15.8h6.8v26.5h-5.7l-0.9-4h0c-0.8,1.5-2,2.7-3.4,3.5s-3.1,1.2-4.9,1.2C321.5,209.4,319.6,208.7,318.1,207.2L318.1,207.2zM353.9,207.3c-1.5-1.5-2.3-3.6-2.3-6.2v-13.7H347v-5.2h4.6V175l6.8-1.5v8.7h9v5.2h-9v12.5c0,1.3,0.3,2.3,0.9,3c0.6,0.7,1.4,1.1,2.4,1.1c2.1,0,3.4-1.3,4-3.9l3.3,3.6c-0.5,1.9-1.5,3.3-3,4.4c-1.5,1.1-3.3,1.6-5.5,1.6C357.6,209.5,355.4,208.8,353.9,207.3L353.9,207.3z M376.9,170.2h6.8v16h0c0.8-1.5,2-2.7,3.4-3.5s3-1.2,4.9-1.2c2.5,0,4.4,0.8,5.8,2.2c1.4,1.5,2.1,3.6,2.1,6.3v18.7H393v-17.4c0-1.4-0.4-2.4-1.1-3.2c-0.7-0.8-1.7-1.1-2.9-1.1c-1.7,0-3,0.5-4,1.6s-1.5,2.5-1.5,4.3v15.8h-6.8L376.9,170.2L376.9,170.2z M409.8,170.2h6.8v38.5h-6.8V170.2z M432.3,207.8c-2.1-1.2-3.7-2.9-4.8-5c-1.1-2.2-1.7-4.7-1.7-7.6s0.5-5.2,1.6-7.3c1-2.1,2.5-3.7,4.4-4.9s4.1-1.7,6.7-1.7s4.6,0.6,6.5,1.7c1.8,1.1,3.2,2.7,4.2,4.8s1.5,4.5,1.5,7.2c0,1.2-0.1,2.1-0.2,2.5h-17.8c0.2,2.1,0.9,3.8,2.2,5.1c1.3,1.2,2.9,1.9,4.9,1.9c1.5,0,2.8-0.4,3.9-1.1s1.9-1.7,2.4-3l5.2,2.1c-0.7,2.2-2.1,4-4.2,5.3c-2.1,1.3-4.5,1.9-7.3,1.9S434.4,209,432.3,207.8L432.3,207.8z M443.7,193c-0.1-2-0.6-3.6-1.5-4.8c-0.9-1.1-2.2-1.7-3.8-1.7c-1.7,0-3,0.6-4,1.7s-1.6,2.7-1.9,4.8H443.7z M462,187.4h-4.8v-5.2h4.8v-4.4c0-2.6,0.8-4.6,2.5-6.1s3.9-2.3,6.6-2.3c2.1,0,4,0.5,5.5,1.5c1.5,1,2.5,2.4,3.1,4.1l-3.4,3.7c-0.3-1.1-0.8-2-1.5-2.7c-0.7-0.7-1.5-1-2.5-1s-1.8,0.4-2.4,1.1s-0.9,1.6-0.9,2.8v3.4h8.9v5.2h-8.9v21.3H462L462,187.4L462,187.4z M491.8,207.3c-1.5-1.5-2.3-3.6-2.3-6.2v-13.7h-4.6v-5.2h4.6V175l6.8-1.5v8.7h9v5.2h-9v12.5c0,1.3,0.3,2.3,0.9,3c0.6,0.7,1.4,1.1,2.4,1.1c2.1,0,3.4-1.3,4-3.9l3.3,3.6c-0.5,1.9-1.5,3.3-3,4.4c-1.5,1.1-3.3,1.6-5.5,1.6C495.5,209.5,493.3,208.8,491.8,207.3L491.8,207.3z" fill=var(--al-theme-color-content-default-weak) stroke-width=0 /></svg>
                </a>
                <al-divider></al-divider>
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
                    <al-button variant="tertiary" ?hideText=${true}><al-icon-chevron-up slot="before"></al-icon-chevron-down></al-button>
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
                <al-drawer alignment="right" ?hasBackdrop=${true} width="400">
                  <al-button slot="trigger" ?hideText=${true} variant="tertiary"><al-badge variant="danger" slot="after" ?isDot=${true} class="al-l-dashboard__notifications-badge"></al-badge><al-icon-bell slot="after"></al-icon-bell></al-button>
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
