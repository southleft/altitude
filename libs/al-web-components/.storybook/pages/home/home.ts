import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import styles from './home.scss';
import '../../templates/dashboard/dashboard';
import '../../../components/calendar/calendar';
import '../../components/f-po/f-po';

/**
 * Page: al-l-home
 */
export class ALHome extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @property()
  accessor styleModifier: string;

  firstUpdated() {
    const body = document.querySelector('body') as HTMLBodyElement;
    body.classList.add('al-u-is-overflow-hidden');
  }

  render() {
    const componentClassNames = classMap({
      'al-l-home': true,
      [this.styleModifier]: !!this.styleModifier
    });

    return html`
      <al-dashboard class=${componentClassNames}>
        <div class="al-u-grid al-u-gap--lg" style="height: 100%">
          <f-po class="al-u-grid__item col:12 col:7@xl">Coming soon</f-po>
          <al-calendar class="al-u-grid__item col:12 col:5@xl row:2@md"></al-calendar>
          <f-po class="al-u-grid__item col:12 col:7@xl">Coming soon</f-po>
          <f-po class="al-u-grid__item col:12">Coming soon</f-po>
        </div>
      </al-dashboard>
    `;
  }
}

if (customElements.get('al-home') === undefined) {
  customElements.define('al-home', ALHome);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-home': ALHome;
  }
}
