import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import styles from './f-po.scss';

export class FPO extends LitElement {
  static get styles() {
    return unsafeCSS(styles);
  }

  @property()
  accessor styleModifier: string;

  @property()
  accessor inlineStyle: string;

  render() {
    const componentClassNames = classMap({
      'f-po': true,
      [this.styleModifier]: !!this.styleModifier
    });

    return html`
      <div class=${componentClassNames} style=${ifDefined(this.inlineStyle)}>
        <slot></slot>
      </div>
    `;
  }
}

if (customElements.get('f-po') === undefined) {
  customElements.define('f-po', FPO);
}

declare global {
  interface HTMLElementTagNameMap {
    'f-po': FPO;
  }
}
