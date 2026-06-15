import { html, LitElement, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import styles from './icon-svgs.scss';
import '../token-code/token-code';

// Eager-glob every <al-icon-*> component so they're registered before
// render. Replaces the legacy webpack `require.context('…',false,/\.ts$/)`
// dynamic loader.
const ICON_MODULES = import.meta.glob('../../../components/icon/icons/*.ts', { eager: true }) as Record<string, unknown>;

@customElement('icon-svgs')
export class IconSvgs extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  ALL_ICONS = Object.keys(ICON_MODULES)
    .map((path) => ({ name: path.match(/\/([\w-]+)\.ts$/)![1] }))
    .sort((a, b) => a.name.localeCompare(b.name));

  renderIconList() {
    return this.ALL_ICONS.map((item) => {
      return unsafeHTML(
        `<tr class="token-specimen token-specimen--icon">
            <td><token-code value="&lt;al-icon-${item.name}&gt;&lt;/al-icon-${item.name}&gt;"></token-code></td>
            <td>${item.name}</td>
            <td class="token-specimen__example">
              <div class="icon" style="--al-icon-width: var(--al-theme-icon); --al-icon-height: var(--al-theme-icon);">
                <al-icon-${item.name}></al-icon-${item.name}>
              </div>
            </td>
          </tr>`
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
