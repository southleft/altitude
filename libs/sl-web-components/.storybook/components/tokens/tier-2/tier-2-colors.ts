import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';

export class Tier2Colors extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  filterTokens(prefix) {
    return Object.entries(tokens)
      .filter(([name]) => name.startsWith(prefix))
      .map(([name, value]) => ({
        name: `--${name}`,
        value
      }));
  }

  render() {
    return html`
      <section>
        <header>
          <h1>Tier 2: Colors</h1>
          <p>These token values should be the only ones used in components.</p>
        </header>
        <table>
          <caption>Background Colors</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-theme-color-background').map((item) => {
              return html`
                <token-specimen
                  variant="color"
                  name="${item.name}"
                  value="${item.value}"
                  inlineStyles="background-color: var(${item.name});"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption>Content Colors</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('sl-theme-color-content').map((item) => {
              return html`
                <token-specimen
                  variant="color"
                  name="${item.name}"
                  value="${item.value}"
                  inlineStyles="background-color: var(${item.name});"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption>Border Colors</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('sl-theme-color-border').map((item) => {
              return html`
                <token-specimen
                  variant="color"
                  name="${item.name}"
                  value="${item.value}"
                  inlineStyles="background-color: var(${item.name});"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-2-colors') === undefined) {
  customElements.define('tier-2-colors', Tier2Colors);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-2-colors': Tier2Colors;
  }
}
