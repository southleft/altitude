import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import '../../token-specimen/token-specimen';
import styles from '../tokens.scss';

export class Tier2Spacing extends LitElement {
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
          <h1>Tier 2: Spacing</h1>
        </header>
        <table>
          <caption>Spacing</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-theme-space').map((item) => {
              return html`
                <token-specimen
                  name="${item.name}"
                  value="${item.value}"
                  inlineStyles="width: 100px; height: var(${item.name});"
                >
                </token-specimen>
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-2-spacing') === undefined) {
  customElements.define('tier-2-spacing', Tier2Spacing);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-2-spacing': Tier2Spacing;
  }
}
