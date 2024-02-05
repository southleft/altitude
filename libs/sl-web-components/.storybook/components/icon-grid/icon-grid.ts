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
          <div class="icon-grid__text">${`sl-icon-`}${item.name}</div>
        </li>`
      );
    });
  }

  render() {
    return html`
      <div class="icon-grid">
        <header>
          <h1>Icon Grid</h1>
          <p>Icon names should accurately describe the represented concept or action in a clear and intuitive manner. Avoid obscure or ambiguous names that could lead to confusion or misinterpretation.</p>
        </header>
        <ul class="icon-grid__list">
          ${this.renderIconList()}
        </ul>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'icon-grid': IconGrid;
  }
}
