import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';

export class Tier2Shadows extends LitElement {
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
          <h1>Tier 2: Shadows</h1>
        </header>
        <table>
          <caption>
            Box Shadows
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-theme-box-shadow').map((item) => {
              return html`
                <token-specimen
                  variant="shadow"
                  name="${item.name}"
                  value="${item.value}"
                  inlineStyles="box-shadow: var(${item.name});"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-2-shadows') === undefined) {
  customElements.define('tier-2-shadows', Tier2Shadows);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-2-shadows': Tier2Shadows;
  }
}
