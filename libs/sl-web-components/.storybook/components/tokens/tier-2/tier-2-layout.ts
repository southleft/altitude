import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';

export class Tier2Layout extends LitElement {
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
          <h1>Tier 2: Layout</h1>
        </header>
        <table>
          <caption>Max Widths</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-theme-layout').map((item) => {
              return html`
                <token-specimen
                  name="${item.name}"
                  value="${item.value}"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-2-layout') === undefined) {
  customElements.define('tier-2-layout', Tier2Layout);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-2-layout': Tier2Layout;
  }
}
