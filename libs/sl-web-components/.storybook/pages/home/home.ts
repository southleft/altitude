import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import styles from './home.scss';
import '../../templates/dashboard/dashboard';

/**
 * Page: sl-l-home
 * @slot - The pages content
 */
export class SLHome extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @property()
  accessor styleModifier: string;

  render() {
    const componentClassNames = classMap({
      'sl-l-home': true,
      [this.styleModifier]: !!this.styleModifier
    });

    return html`
      <sl-dashboard class=${componentClassNames}>
        <div class="sl-u-grid sl-u-gap--lg" style="height: 100%">
          <f-po class="sl-u-grid__item col:7@md">Coming soon</f-po>
          <f-po class="sl-u-grid__item col:5@md row:2@md">Coming soon</f-po>
          <f-po class="sl-u-grid__item col:7@md">Coming soon</f-po>
          <f-po class="sl-u-grid__item col:12@md">Coming soon</f-po>
        </div>
      </sl-dashboard>
    `;
  }
}

if (customElements.get('sl-home') === undefined) {
  customElements.define('sl-home', SLHome);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-home': SLHome;
  }
}
