import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';

export class Tier1Colors extends LitElement {
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
          <h1>Tier 1: Colors</h1>
          <p>Tier 1 color tokens define all color values used by the SL theme. Tier 1 token values are displayed here for reference only and are not to
          be used directly by SL components. Tier 2 token values should be used instead.</p>
        </header>
        <table>
          <caption>Brand Colors</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-color-brand').map((item) => {
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
          <caption>Utility Colors</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-color-utility').map((item) => {
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
          <caption>Neutral Colors</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('sl-color-neutral').map((item) => {
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
          <caption>Transparent Colors</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('sl-color-transparent').map((item) => {
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

if (customElements.get('tier-1-colors') === undefined) {
  customElements.define('tier-1-colors', Tier1Colors);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-1-colors': Tier1Colors;
  }
}
