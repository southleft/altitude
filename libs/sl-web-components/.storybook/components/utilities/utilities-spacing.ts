import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../styles/tokens.json';
import styles from './utilities.scss';
import '../token-specimen/token-specimen';
import '../f-po/f-po';

const codeSpacing = String.raw`<div class="sl-u-spacing">
  <div>Item</div>
  <div>Item</div>
  <div>Item</div>
</div>`;

const codeGap = String.raw`<div class="sl-u-gap">
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
            <h2>Spacing</h2>
            <p>Spacing utility classes provide convenient ways to add consistent spacing between elements in your layout. All children (except the first child), gets a margin applied ot the top.</p>
            <h3>Code Guidelines</h3>
            <p>Apply the utility class to the parent wrapper to add space between the child elements.</p>
            <pre><code>${codeSpacing}</code></pre>
          </caption>
          <thead>
            <tr>
              <th>Utility Class</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-theme-space').map((item) => {
              return html`
                <token-specimen
                  variant="space"
                  value=".${item.name.replace('--sl-theme-space', 'sl-u-spacing')}"
                  inlineStyles="width: auto; height: auto;"
                >
                  <div class="${item.name.replace('--sl-theme-space', 'sl-u-spacing')}">
                    <div><f-po></f-po></div>
                    <div><f-po></f-po></div>
                    <div><f-po></f-po></div>
                  </div>
                </token-specimen>
              `;
            })}
          </tbody>
        </table>
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
            ${this.filterTokens('sl-theme-space').map((item) => {
              return html`
                <token-specimen
                  variant="space"
                  value=".${item.name.replace('--sl-theme-space', 'sl-u-gap')}"
                  inlineStyles="width: auto; height: auto;"
                >
                  <div class="${item.name.replace('--sl-theme-space', 'sl-u-gap')}" style="display: flex;">
                    <div><f-po></f-po></div>
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
