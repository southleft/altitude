import { html, LitElement, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import styles from './icon-svgs.scss';

@customElement('icon-svgs')
export class IconSvgs extends LitElement {
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
        `<token-specimen
            variant="icon"
            name="<al-icon-${item.name}></al-icon-${item.name}>"
            value="${item.name}"
            inlineStyles="--al-icon-width: var(--al-theme-icon); --al-icon-height: var(--al-theme-icon);"
          >
            <al-icon-${item.name}></al-icon-${item.name}>
          </token-specimen>`
      );
    });
  }

  render() {
    return html`
      <section>
        <header>
          <h1>Icon Svgs</h1>
          <p>Icon names should accurately describe the represented concept or action in a clear and intuitive manner. Avoid obscure or ambiguous names that could lead to confusion or misinterpretation.</p>
        </header>
        <table>
          <caption><h2>Sizes</h2></caption>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.renderIconList()}
          </tbody>
        </table>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'icon-svgs': IconSvgs;
  }
}
