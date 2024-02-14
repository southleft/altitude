import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import styles from './job-board.scss';
import '../../templates/dashboard/dashboard';

/**
 * Page: sl-l-job-board
 * @slot - The pages content
 */
export class SLJobBoard extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @property()
  accessor styleModifier: string;

  render() {
    const componentClassNames = classMap({
      'sl-l-job-board': true,
      [this.styleModifier]: !!this.styleModifier
    });

    return html`
      <sl-dashboard class=${componentClassNames}>
        <div>Coming soon</div>
      </sl-dashboard>
    `;
  }
}

if (customElements.get('sl-job-board') === undefined) {
  customElements.define('sl-job-board', SLJobBoard);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-job-board': SLJobBoard;
  }
}
