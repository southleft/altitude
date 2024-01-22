import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import '../../token-specimen/token-specimen';
import styles from '../tokens.scss';

export class Tier1Shadows extends LitElement {
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
          <h1>Tier 1: Shadows</h1>
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
            ${this.filterTokens('sl-box-shadow').map((item) => {
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

if (customElements.get('tier-1-shadows') === undefined) {
  customElements.define('tier-1-shadows', Tier1Shadows);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-1-shadows': Tier1Shadows;
  }
}
