import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import styles from './home.scss';
import * as Breadcrumbs from '../../../components/breadcrumbs/breadcrumbs.stories.ts';
import * as Pagination from '../../../components/pagination/pagination.stories.ts';
import * as Card from '../../../components/card/card.stories.ts';
import '../../templates/basic-page/basic-page';
import '../../../components/layout-section/layout-section';

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
      <sl-basic-page class=${componentClassNames}>
        <sl-layout-section>
          ${Breadcrumbs.Truncated({isTruncated: true})}
        </sl-layout-section>
        <sl-layout-section>
          <div class="sl-u-grid cols:6@sm cols:4@md cols:3@lg sl-u-gap--md">
            ${Card.WithContent({})}
            ${Card.WithContent({})}
            ${Card.WithContent({})}
            ${Card.WithContent({})}
            ${Card.WithContent({})}
            ${Card.WithContent({})}
            ${Card.WithContent({})}
            ${Card.WithContent({})}
            ${Card.WithContent({})}
            ${Card.WithContent({})}
            ${Card.WithContent({})}
            ${Card.WithContent({})}
          </div>
        </sl-layout-section>
        <sl-layout-section>
          ${Pagination.Default({totalRecords: '200', pageSize: '20'})}
        </sl-layout-section>
      </sl-basic-page>
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
