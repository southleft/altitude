import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import '../../token-specimen/token-specimen';
import styles from '../tokens.scss';

export class Tier2Border extends LitElement {
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
          <h1>Tier 2: Borders</h1>
        </header>
        <table>
          <caption>
            Border Width
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-theme-border-width').map((item) => {
              return html`
                <token-specimen
                  variant="border"
                  name="${item.name}"
                  value="${item.value}"
                  inlineStyles="border-width: ${item.value};"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption>
            Border Radius
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-theme-border-radius').map((item) => {
              return html`
                <token-specimen
                  variant="border"
                  name="${item.name}"
                  value="${item.value}"
                  inlineStyles="border-radius: ${item.value};"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-2-border') === undefined) {
  customElements.define('tier-2-border', Tier2Border);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-2-border': Tier2Border;
  }
}
