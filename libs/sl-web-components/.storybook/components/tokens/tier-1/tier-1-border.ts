import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';

export class Tier1Border extends LitElement {
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
          <h1>Tier 1: Border</h1>
        </header>
        <table>
          <caption>Border Width</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-border-width').map((item) => {
              return html`
                <token-specimen
                  variant="border"
                  name="${item.name}"
                  value="${item.value}"
                  inlineStyles="border-width: var(${item.name});"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption>Border Radius</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('sl-border-radius').map((item) => {
              return html`
                <token-specimen
                  variant="border"
                  name="${item.name}"
                  value="${item.value}"
                  inlineStyles="border-radius: var(${item.name});"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-1-border') === undefined) {
  customElements.define('tier-1-border', Tier1Border);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-1-border': Tier1Border;
  }
}
