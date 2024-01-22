import { html, LitElement, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import styles from './icon-grid.scss';

@customElement('icon-grid')
export class IconGrid extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  ALL_ICONS = require
    .context('../../../components/icon/icons', false, /\.ts$/)
    .keys()
    .map((path) => ({ name: path.match(/([\w\s-]*)\.ts$/)[1] }));

  renderIconList() {
    return this.ALL_ICONS.map((item) => {
      return unsafeHTML(
        `<li class="icon-grid__item">
          <sl-icon-${item.name}></sl-icon-${item.name}>
          <div class="icon-grid__text">${item.name}</div>
        </li>`
      );
    });
  }

  render() {
    return html`
      <ul class="icon-grid">
        ${this.renderIconList()}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'icon-grid': IconGrid;
  }
}
