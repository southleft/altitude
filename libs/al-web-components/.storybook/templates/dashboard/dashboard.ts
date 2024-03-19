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
                  <svg id="b" xmlns="http://www.w3.org/2000/svg" width="1056.7" height="220.5" viewBox="0 0 1056.7 220.5">
                    <path d="M111.5,100.5l-56-29.4L0,100v29.3l55.5-29.6,56,29.9v-29.1ZM111.5,29.4L55.5,0,0,28.9v29.3l55.5-29.6,56,29.9v-29.1Z" fill="var(--al-theme-color-background-accent-default)" stroke-width="0"/>
                    <path d="M487.4,2.7l9.2,32.7-.3.2c-8.4-7.6-16.4-9-27.7-9h-10.5l.2,88.2c0,8.4,3.7,12.5,9.2,15v.3h-44.6v-.3c5.5-2.3,9.2-6.6,9.2-15V26.6h-10.4c-11.3,0-19.4,1.5-27.7,9l-.3-.2,8.9-32.7h84.8ZM284.2,129.7v.3h-34l-8.2-26.2-2.4-7-20.9,11-21.2-11.2-2.4,7.2-8.8,26.2h-33v-.3c3.5-1.5,6.3-3.8,7.9-7.5l37.4-104.7c1.8-6.5.2-12.4-4.7-14.4v-.3h50s0,.4,0,.3c-4.7,2-6.4,7.5-4.9,13.7l37.3,105.4c1.5,3.6,4.3,6,7.9,7.5h0ZM231.9,73.7l-13.3-41.9-13.7,41.7,13.7,7.3,13.3-7.1ZM364.7,106.1h-28.9V18c0-8.4,3.7-12.7,9.2-15v-.3h-44.6v.3c5.5,2.4,9.2,6.6,9.2,15v96.7c0,8.4-3.7,12.7-9.2,15v.3h83.3l9.2-32.9-.5-.3c-8.3,8.1-16.9,9.3-27.7,9.3ZM544.3,114.7l-.2-96.7c0-8.4,3.7-12.7,9.2-15v-.3h-44.6v.3c5.5,2.4,9.2,6.6,9.2,15v33.5l.2,26.9v36.4c0,8.4-3.7,12.7-9.2,15v.3h44.6v-.3c-5.6-2.4-9.2-6.7-9.2-15.1ZM1056.1,96.7c-8.3,7.6-16.4,9.3-27.7,9.3h-34.5v-29h26c8.7,0,12.8,3.8,15.4,9.5h.3v-42.6h-.3c-2.6,5.7-6.7,9.5-15.4,9.5h-26v-26.9h32.6c11.3,0,19.3,1.7,27.5,9.5l.3-.3-8.3-32.9h-87.7v.3c5.5,2.4,9.2,6.6,9.2,15v96.7c0,8.4-3.7,12.7-9.2,15v.3h89.7l8.7-32.7-.6-.7ZM935,42.2c1.6,7.4,2.4,14.4,2.4,21.1,0,16.9-3.4,31.3-10.2,43-9.2,15.8-23.4,23.7-42.7,23.7h-64.1v-.3c5.3-2.2,8.9-6.3,9.2-14.1V16.2c-.5-7.2-4.1-11-9.2-13.1v-.3h64c7.9.1,14.5,1,19.7,2.8,8.9,2.9,16.1,8.3,21.7,16.2,4.5,6.1,7.6,13,9.2,20.4h0ZM910.4,65c0-13-2-22.9-6-29.9-4.1-6.9-12.2-10.4-24.3-10.4h-24.5v83.1h24.5c12.6,0,21.3-6.2,26.3-18.6,2.6-6.7,4-14.8,4-24.2h0ZM576.4,2.7l-8.9,32.7.3.2c8.3-7.5,16.4-9,27.7-9h10.2v88.2c0,8.4-3.7,12.7-9.2,15v.3h44.6v-.3c-5.3-2.4-9-6.6-9-15l-.2-88.2h10.4c11.3,0,19.3,1.4,27.7,9l.3-.2-9-32.7h-84.9ZM756.7,3c5.3,2.4,9,6.6,9,15v64.3c0,15.6-9.9,24-21.4,24s-21.4-8.4-21.4-24V18c0-8.4,3.7-12.7,9.2-15v-.3h-44.6v.3c5.5,2.4,9.2,6.6,9.2,15v65.7c0,29.5,21.1,48.6,47.7,48.6s47.8-19.1,47.8-48.6V18c0-8.4,3.7-12.7,9.2-15v-.3h-44.6v.3h-.1Z" fill="var(--al-theme-color-content-default)" stroke-width="0"/>
                    <path d="M158.44,171.77h16.22c3.67,0,6.53.87,8.58,2.6,2.05,1.73,3.07,4.18,3.07,7.33,0,2.01-.52,3.73-1.56,5.15-1.04,1.42-2.48,2.38-4.32,2.86v.1c2.15.49,3.81,1.48,4.99,2.99,1.18,1.51,1.77,3.42,1.77,5.75,0,3.19-1.07,5.68-3.22,7.46-2.15,1.79-5.17,2.68-9.05,2.68h-16.48v-36.92ZM173.52,187.16c1.66,0,2.96-.42,3.9-1.27s1.4-2.02,1.4-3.51-.47-2.66-1.4-3.51c-.94-.85-2.24-1.27-3.9-1.27h-7.49v9.57h7.49ZM173.52,202.87c1.91,0,3.41-.45,4.5-1.35,1.09-.9,1.64-2.17,1.64-3.8s-.55-2.89-1.64-3.8c-1.09-.9-2.59-1.35-4.5-1.35h-7.49v10.3h7.49ZM198.63,219.09c-2.11-.94-3.81-2.25-5.1-3.95l3.54-4.58c.94,1.32,2.11,2.34,3.51,3.07,1.4.73,2.92,1.09,4.55,1.09,2.25,0,4.03-.66,5.33-1.98s1.95-3.14,1.95-5.46v-1.92h-.05c-.76,1.46-1.79,2.6-3.09,3.43-1.3.83-2.71,1.25-4.24,1.25-2.74,0-4.91-.88-6.5-2.65-1.59-1.77-2.39-4.18-2.39-7.23v-17.99h6.81v17.26c0,1.49.38,2.69,1.14,3.59.76.9,1.82,1.35,3.17,1.35,1.49,0,2.7-.49,3.64-1.48s1.4-2.3,1.4-3.93v-16.8h6.76l.05,25.43c0,4.02-1.21,7.18-3.61,9.46-2.41,2.29-5.69,3.43-9.85,3.43-2.57,0-4.91-.47-7.02-1.4ZM251.31,208.28c-2.22-1.04-3.98-2.52-5.28-4.45s-2-4.17-2.11-6.73l7.07-1.25c.07,2.39.88,4.32,2.42,5.8,1.54,1.47,3.48,2.21,5.8,2.21,1.94,0,3.49-.48,4.65-1.43,1.16-.95,1.74-2.16,1.74-3.61,0-1.18-.43-2.16-1.3-2.94-.87-.78-2.25-1.45-4.16-2l-5.1-1.46c-3.4-.9-5.87-2.19-7.41-3.87-1.54-1.68-2.31-3.89-2.31-6.63,0-2.22.51-4.18,1.53-5.88,1.02-1.7,2.5-3.02,4.45-3.98,1.94-.95,4.21-1.43,6.81-1.43,2.39,0,4.53.45,6.42,1.35,1.89.9,3.4,2.18,4.52,3.82,1.13,1.65,1.76,3.54,1.9,5.69l-6.92,1.46c-.07-1.91-.67-3.45-1.79-4.63-1.13-1.18-2.54-1.77-4.24-1.77s-2.94.44-3.93,1.33c-.99.88-1.48,2-1.48,3.35,0,1.21.41,2.21,1.22,2.99.81.78,2.12,1.41,3.93,1.9l5.04,1.4c3.5.9,6.07,2.2,7.7,3.9,1.63,1.7,2.44,3.93,2.44,6.71,0,2.29-.56,4.32-1.69,6.08-1.13,1.77-2.75,3.15-4.86,4.13-2.11.99-4.59,1.48-7.44,1.48s-5.43-.52-7.64-1.56ZM287.03,207.83c-1.98-1.16-3.5-2.82-4.58-4.97-1.07-2.15-1.61-4.64-1.61-7.49s.54-5.32,1.61-7.44c1.07-2.11,2.6-3.75,4.58-4.91,1.98-1.16,4.28-1.74,6.92-1.74s4.94.58,6.92,1.74c1.98,1.16,3.5,2.8,4.58,4.91,1.07,2.12,1.61,4.59,1.61,7.44s-.54,5.34-1.61,7.49c-1.07,2.15-2.6,3.8-4.58,4.97s-4.28,1.74-6.92,1.74-4.94-.58-6.92-1.74ZM298.58,201.49c1.14-1.51,1.72-3.54,1.72-6.11s-.57-4.54-1.72-6.03-2.69-2.24-4.63-2.24-3.48.75-4.63,2.24-1.72,3.5-1.72,6.03.57,4.6,1.72,6.11,2.69,2.26,4.63,2.26,3.48-.75,4.63-2.26ZM318.15,207.16c-1.4-1.51-2.11-3.61-2.11-6.32v-18.67h6.76v17.37c0,1.35.35,2.41,1.07,3.17.71.76,1.67,1.14,2.89,1.14,1.63,0,2.94-.54,3.93-1.61.99-1.07,1.48-2.51,1.48-4.32v-15.76h6.81v26.52h-5.72l-.88-4h-.05c-.83,1.53-1.97,2.7-3.41,3.51-1.44.81-3.08,1.22-4.91,1.22-2.5,0-4.45-.75-5.85-2.26ZM353.88,207.26c-1.54-1.51-2.31-3.58-2.31-6.21v-13.68h-4.58v-5.2h4.58v-7.18l6.76-1.51v8.68h9v5.2h-9v12.48c0,1.28.29,2.28.86,2.99.57.71,1.36,1.07,2.37,1.07,2.08,0,3.41-1.32,4-3.95l3.28,3.59c-.52,1.87-1.53,3.34-3.04,4.39-1.51,1.06-3.34,1.59-5.49,1.59-2.74,0-4.88-.75-6.42-2.26ZM376.89,170.21h6.81v15.96h.05c.83-1.53,1.95-2.7,3.35-3.51,1.4-.81,3.02-1.22,4.86-1.22,2.46,0,4.39.75,5.77,2.24,1.39,1.49,2.08,3.61,2.08,6.34v18.67h-6.76v-17.37c0-1.35-.36-2.41-1.07-3.17-.71-.76-1.67-1.14-2.89-1.14-1.66,0-2.98.53-3.95,1.59-.97,1.06-1.46,2.5-1.46,4.34v15.76h-6.81v-38.48ZM409.75,170.21h6.81v38.48h-6.81v-38.48ZM432.32,207.81c-2.08-1.18-3.69-2.86-4.84-5.04-1.14-2.18-1.72-4.71-1.72-7.59s.52-5.21,1.56-7.31c1.04-2.1,2.51-3.72,4.42-4.86,1.91-1.14,4.12-1.72,6.66-1.72s4.61.56,6.45,1.66c1.84,1.11,3.25,2.7,4.24,4.76.99,2.06,1.48,4.46,1.48,7.2,0,1.21-.07,2.05-.21,2.5h-17.84c.17,2.15.89,3.84,2.16,5.07,1.27,1.23,2.9,1.85,4.91,1.85,1.49,0,2.79-.36,3.9-1.09,1.11-.73,1.91-1.73,2.39-3.02l5.25,2.08c-.73,2.25-2.14,4.03-4.24,5.33-2.1,1.3-4.53,1.95-7.31,1.95s-5.2-.59-7.28-1.77ZM443.71,192.99c-.1-2.04-.62-3.63-1.53-4.76-.92-1.13-2.18-1.69-3.77-1.69-1.7,0-3.04.56-4.03,1.69-.99,1.13-1.6,2.71-1.85,4.76h11.18ZM461.96,187.37h-4.84v-5.2h4.84v-4.42c0-2.56.82-4.6,2.47-6.11,1.65-1.51,3.86-2.26,6.63-2.26,2.15,0,3.97.49,5.46,1.48,1.49.99,2.51,2.35,3.07,4.08l-3.43,3.69c-.28-1.11-.77-2-1.48-2.68-.71-.68-1.55-1.01-2.52-1.01s-1.82.36-2.44,1.07c-.62.71-.94,1.64-.94,2.78v3.38h8.89v5.2h-8.89v21.32h-6.76l-.05-21.32ZM491.78,207.26c-1.54-1.51-2.31-3.58-2.31-6.21v-13.68h-4.58v-5.2h4.58v-7.18l6.76-1.51v8.68h9v5.2h-9v12.48c0,1.28.29,2.28.86,2.99.57.71,1.36,1.07,2.37,1.07,2.08,0,3.41-1.32,4-3.95l3.28,3.59c-.52,1.87-1.53,3.34-3.04,4.39-1.51,1.06-3.34,1.59-5.49,1.59-2.74,0-4.88-.75-6.42-2.26ZM560.7,171.77h7.7l6.5,29.28h.1l6.24-29.28h9.57l6.24,29.28h.1l6.4-29.28h7.7l-9.15,36.92h-9.93l-6.08-28.7h-.1l-6.19,28.7h-9.88l-9.2-36.92ZM622.48,207.81c-2.08-1.18-3.69-2.86-4.84-5.04-1.14-2.18-1.72-4.71-1.72-7.59s.52-5.21,1.56-7.31c1.04-2.1,2.51-3.72,4.42-4.86,1.91-1.14,4.12-1.72,6.66-1.72s4.61.56,6.45,1.66c1.84,1.11,3.25,2.7,4.24,4.76.99,2.06,1.48,4.46,1.48,7.2,0,1.21-.07,2.05-.21,2.5h-17.84c.17,2.15.89,3.84,2.16,5.07,1.27,1.23,2.9,1.85,4.91,1.85,1.49,0,2.79-.36,3.9-1.09,1.11-.73,1.91-1.73,2.39-3.02l5.25,2.08c-.73,2.25-2.14,4.03-4.24,5.33-2.1,1.3-4.53,1.95-7.31,1.95s-5.2-.59-7.28-1.77ZM633.87,192.99c-.1-2.04-.62-3.63-1.53-4.76-.92-1.13-2.18-1.69-3.77-1.69-1.7,0-3.04.56-4.03,1.69-.99,1.13-1.6,2.71-1.85,4.76h11.18ZM660.21,208.2c-1.44-.85-2.54-2.05-3.3-3.61h-.05l-.78,4.11h-5.82v-38.48h6.81v15.91h.05c.8-1.52,1.88-2.69,3.25-3.51,1.37-.81,2.94-1.22,4.71-1.22,2.15,0,4.04.57,5.67,1.72,1.63,1.14,2.89,2.77,3.77,4.89.88,2.12,1.33,4.59,1.33,7.44s-.44,5.32-1.33,7.44c-.88,2.12-2.14,3.74-3.77,4.89-1.63,1.14-3.52,1.72-5.67,1.72-1.8,0-3.42-.42-4.86-1.27ZM667.38,201.31c1.13-1.46,1.69-3.41,1.69-5.88s-.56-4.38-1.69-5.85c-1.13-1.47-2.61-2.21-4.45-2.21s-3.36.73-4.47,2.18c-1.11,1.46-1.66,3.42-1.66,5.88s.55,4.42,1.66,5.88c1.11,1.46,2.6,2.18,4.47,2.18s3.32-.73,4.45-2.18ZM708.75,207.44c-2.7-1.59-4.78-3.87-6.24-6.81s-2.18-6.41-2.18-10.4.68-7.46,2.05-10.43c1.37-2.96,3.34-5.23,5.9-6.81,2.56-1.58,5.56-2.37,9-2.37,4.02,0,7.39,1.21,10.11,3.61,2.72,2.41,4.43,5.75,5.12,10.01l-7.07,1.4c-.45-2.7-1.4-4.8-2.83-6.29-1.44-1.49-3.23-2.24-5.38-2.24-2.88,0-5.15,1.17-6.81,3.51-1.66,2.34-2.5,5.54-2.5,9.59s.93,7.19,2.78,9.52c1.85,2.32,4.39,3.48,7.62,3.48,2.6,0,4.78-.89,6.55-2.68,1.77-1.79,2.88-4.22,3.33-7.31l7.07,1.3c-.42,3.12-1.38,5.83-2.89,8.14-1.51,2.31-3.47,4.07-5.88,5.3-2.41,1.23-5.14,1.85-8.19,1.85-3.67,0-6.86-.8-9.57-2.39ZM749.36,207.83c-1.98-1.16-3.5-2.82-4.58-4.97-1.07-2.15-1.61-4.64-1.61-7.49s.54-5.32,1.61-7.44c1.07-2.11,2.6-3.75,4.58-4.91,1.98-1.16,4.28-1.74,6.92-1.74s4.94.58,6.92,1.74c1.98,1.16,3.5,2.8,4.58,4.91,1.07,2.12,1.61,4.59,1.61,7.44s-.54,5.34-1.61,7.49c-1.07,2.15-2.6,3.8-4.58,4.97s-4.28,1.74-6.92,1.74-4.94-.58-6.92-1.74ZM760.9,201.49c1.14-1.51,1.72-3.54,1.72-6.11s-.57-4.54-1.72-6.03-2.69-2.24-4.63-2.24-3.48.75-4.63,2.24-1.72,3.5-1.72,6.03.57,4.6,1.72,6.11,2.69,2.26,4.63,2.26,3.48-.75,4.63-2.26ZM778.53,182.17h5.56l.83,4.26h.05c.73-1.59,1.82-2.83,3.28-3.72,1.46-.88,3.1-1.33,4.94-1.33s3.52.45,4.84,1.35c1.32.9,2.27,2.18,2.86,3.85h.05c.94-1.7,2.16-2.99,3.67-3.87,1.51-.88,3.18-1.33,5.02-1.33,2.56,0,4.56.81,5.98,2.42,1.42,1.61,2.13,3.84,2.13,6.68v18.2h-6.81l.05-17.21c0-1.32-.37-2.36-1.12-3.12-.75-.76-1.78-1.14-3.09-1.14-1.63,0-2.9.57-3.82,1.72-.92,1.14-1.38,2.69-1.38,4.63l-.05,15.13h-6.76v-17.21c0-1.32-.37-2.36-1.12-3.12-.75-.76-1.78-1.14-3.09-1.14-1.63,0-2.9.57-3.82,1.72-.92,1.14-1.38,2.69-1.38,4.63v15.13h-6.81v-26.52ZM827.67,182.17h5.82l.78,4.11h.05c.76-1.56,1.86-2.76,3.3-3.61,1.44-.85,3.06-1.27,4.86-1.27,2.15,0,4.04.57,5.67,1.72,1.63,1.14,2.89,2.77,3.77,4.89.88,2.12,1.33,4.59,1.33,7.44s-.44,5.32-1.33,7.44c-.88,2.12-2.14,3.74-3.77,4.89-1.63,1.14-3.52,1.72-5.67,1.72-1.77,0-3.34-.41-4.71-1.22-1.37-.81-2.45-1.98-3.25-3.51h-.05v14.87h-6.81v-37.44ZM844.8,201.28c1.13-1.47,1.69-3.42,1.69-5.85s-.56-4.42-1.69-5.88c-1.13-1.46-2.61-2.18-4.45-2.18s-3.36.73-4.47,2.18c-1.11,1.46-1.66,3.42-1.66,5.88s.55,4.42,1.66,5.88c1.11,1.46,2.6,2.18,4.47,2.18s3.32-.74,4.45-2.21ZM867.81,207.83c-1.98-1.16-3.5-2.82-4.58-4.97-1.07-2.15-1.61-4.64-1.61-7.49s.54-5.32,1.61-7.44c1.07-2.11,2.6-3.75,4.58-4.91,1.98-1.16,4.28-1.74,6.92-1.74s4.94.58,6.92,1.74c1.98,1.16,3.5,2.8,4.58,4.91,1.07,2.12,1.61,4.59,1.61,7.44s-.54,5.34-1.61,7.49c-1.07,2.15-2.6,3.8-4.58,4.97s-4.28,1.74-6.92,1.74-4.94-.58-6.92-1.74ZM879.36,201.49c1.14-1.51,1.72-3.54,1.72-6.11s-.57-4.54-1.72-6.03-2.69-2.24-4.63-2.24-3.48.75-4.63,2.24-1.72,3.5-1.72,6.03.57,4.6,1.72,6.11,2.69,2.26,4.63,2.26,3.48-.75,4.63-2.26ZM917.81,183.71c1.4,1.51,2.11,3.61,2.11,6.32v18.67h-6.76v-17.37c0-1.35-.36-2.41-1.07-3.17-.71-.76-1.67-1.14-2.89-1.14-1.63,0-2.94.54-3.93,1.61-.99,1.08-1.48,2.51-1.48,4.32v15.76h-6.81v-26.52h5.72l.88,4h.05c.83-1.53,1.97-2.7,3.41-3.51,1.44-.81,3.08-1.22,4.91-1.22,2.5,0,4.45.75,5.85,2.26ZM935.52,207.81c-2.08-1.18-3.69-2.86-4.84-5.04-1.14-2.18-1.72-4.71-1.72-7.59s.52-5.21,1.56-7.31c1.04-2.1,2.51-3.72,4.42-4.86,1.91-1.14,4.12-1.72,6.66-1.72s4.61.56,6.45,1.66c1.84,1.11,3.25,2.7,4.24,4.76.99,2.06,1.48,4.46,1.48,7.2,0,1.21-.07,2.05-.21,2.5h-17.84c.17,2.15.89,3.84,2.16,5.07,1.27,1.23,2.9,1.85,4.91,1.85,1.49,0,2.79-.36,3.9-1.09,1.11-.73,1.91-1.73,2.39-3.02l5.25,2.08c-.73,2.25-2.14,4.03-4.24,5.33-2.1,1.3-4.53,1.95-7.31,1.95s-5.2-.59-7.28-1.77ZM946.9,192.99c-.1-2.04-.62-3.63-1.53-4.76-.92-1.13-2.18-1.69-3.77-1.69-1.7,0-3.04.56-4.03,1.69-.99,1.13-1.6,2.71-1.85,4.76h11.18ZM984.11,183.71c1.4,1.51,2.11,3.61,2.11,6.32v18.67h-6.76v-17.37c0-1.35-.36-2.41-1.07-3.17-.71-.76-1.67-1.14-2.89-1.14-1.63,0-2.94.54-3.93,1.61-.99,1.08-1.48,2.51-1.48,4.32v15.76h-6.81v-26.52h5.72l.88,4h.05c.83-1.53,1.97-2.7,3.41-3.51,1.44-.81,3.08-1.22,4.91-1.22,2.5,0,4.45.75,5.85,2.26ZM1000.23,207.26c-1.54-1.51-2.31-3.58-2.31-6.21v-13.68h-4.58v-5.2h4.58v-7.18l6.76-1.51v8.68h9v5.2h-9v12.48c0,1.28.29,2.28.86,2.99.57.71,1.36,1.07,2.37,1.07,2.08,0,3.41-1.32,4-3.95l3.28,3.59c-.52,1.87-1.53,3.34-3.04,4.39-1.51,1.06-3.34,1.59-5.49,1.59-2.74,0-4.88-.75-6.42-2.26ZM1025.84,207.08c-2.22-1.63-3.38-3.92-3.48-6.86l6.14-.99c.07,1.7.65,3.02,1.74,3.95,1.09.94,2.5,1.4,4.24,1.4,1.39,0,2.54-.28,3.46-.83.92-.55,1.38-1.3,1.38-2.24-.03-.8-.42-1.46-1.14-1.98-.73-.52-1.92-.99-3.59-1.4l-3.8-.99c-2.5-.66-4.32-1.58-5.46-2.76s-1.72-2.72-1.72-4.63c0-2.57.93-4.62,2.78-6.16,1.85-1.54,4.27-2.31,7.25-2.31s5.23.72,7.18,2.16c1.94,1.44,3.02,3.42,3.22,5.95l-6.08.99c-.07-1.35-.51-2.39-1.33-3.12-.81-.73-1.88-1.09-3.2-1.09-1.11,0-2.01.28-2.7.83-.69.55-1.04,1.27-1.04,2.13,0,.73.33,1.33.99,1.82.66.49,1.75.95,3.28,1.4l3.8.99c2.74.73,4.74,1.7,6.01,2.91,1.26,1.21,1.9,2.77,1.9,4.68,0,1.7-.49,3.2-1.46,4.5-.97,1.3-2.32,2.31-4.06,3.02-1.73.71-3.69,1.07-5.88,1.07-3.4,0-6.21-.82-8.42-2.44ZM547.61,170.74l-7.2-3.48-21.31,44.07,7.2,3.48,21.31-44.07Z" fill="var(--al-theme-color-content-default-weak)" stroke-width="0"/>
                  </svg>
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
