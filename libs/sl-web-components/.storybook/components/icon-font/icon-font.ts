import { html, LitElement, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './icon-font.scss';

@customElement('icon-font')
export class IconFont extends LitElement {
  static get styles() {
    return unsafeCSS(styles);
  }

  render() {
    return html`
      <ul class="icon-grid">
        <slot></slot>
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'icon-font': IconFont;
  }
}
