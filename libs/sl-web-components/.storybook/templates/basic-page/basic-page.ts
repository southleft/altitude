import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import styles from './basic-page.scss';
import * as Header from '../../../components/header/header.stories.ts';
import '../../../components/layout-container/layout-container';
import '../../../components/layout/layout';
import '../../../components/layout-section/layout-section';
import '../../../components/toggle-button/toggle-button';
import '../../../components/icon/icons/help';
import '../../../components/popover/popover'

/**
 * Template: sl-l-basic-page
 * @slot - The templates content
 */
export class SLBasicPage extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @property()
  accessor styleModifier: string;

  render() {
    const componentClassNames = classMap({
      'sl-l-basic-page': true,
      [this.styleModifier]: !!this.styleModifier
    });

    return html`
      <sl-layout-container class=${componentClassNames}>
        <sl-toggle-button class="sl-l-basic-page__toggle-button" variant="background">
          <sl-popover position="top-left">
            <sl-icon-help slot="trigger" size="lg"></sl-icon-help>
            <f-po>Content</f-po>
          </sl-popover>
        </sl-toggle-button>
        <sl-layout gap="lg">
          <sl-layout-section>
            ${Header.WithContent({})}
          </sl-layout-section>
          <slot></slot>
        </sl-layout>
      </sl-layout-container>
    `;
  }
}

if (customElements.get('sl-basic-page') === undefined) {
  customElements.define('sl-basic-page', SLBasicPage);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-basic-page': SLBasicPage;
  }
}
