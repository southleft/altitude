import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../styles/dist/tokens.json';
import styles from './utilities.scss';
import '../token-specimen/token-specimen';
import '../f-po/f-po';

const codeGap = String.raw`<div class="al-u-gap">
  <div>Item</div>
  <div>Item</div>
  <div>Item</div>
</div>`;

export class UtilitiesSpacing extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  filterTokens(prefix) {
    return Object.entries(tokens)
      .filter(([name]) => name.startsWith(prefix))
      .map(([name, value]) => ({
        name: `--${name}`,
        value,
      }));
  }

  render() {
    return html`
      <section>
        <header>
          <h1>Utilities: Spacing</h1>
          <p></p>
        </header>
        <table>
          <caption>
            <h2>Gap</h2>
            <p>Gap utility classes are used with CSS grid or flex layouts to specify the gap between items. These classes help maintain consistent spacing between elements in the layout.</p>
            <h3>Code Guidelines</h3>
            <p>Apply the utility class to the parent wrapper to add space between the child elements.</p>
            <pre><code>${codeGap}</code></pre>
          </caption>
          <thead>
            <tr>
              <th>Utility Class</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('al-theme-space').map((item) => {
              return html`
                <token-specimen
                  variant="space"
                  name="${item.name.replace('--al-theme-space', 'al-u-gap')}"
                  inlineStyles="width: auto; height: auto;"
                >
                  <div class="${item.name.replace('--al-theme-space', 'al-u-gap')}">
                    <f-po></f-po>
                    <f-po></f-po>
                    <div><f-po></f-po></div>
                    <div><f-po></f-po></div>
                  </div>
                </token-specimen>
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('utilities-spacing') === undefined) {
  customElements.define('utilities-spacing', UtilitiesSpacing);
}

declare global {
  interface HTMLElementTagNameMap {
    'utilities-spacing': UtilitiesSpacing;
  }
}
