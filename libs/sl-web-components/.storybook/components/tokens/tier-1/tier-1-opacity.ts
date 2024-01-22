import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import '../../token-specimen/token-specimen';
import styles from '../tokens.scss';

export class Tier1Opacity extends LitElement {
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
          <h1>Tier 1: Opacity</h1>
        </header>
        <table>
          <caption>
            Opacity
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-opacity').map((item) => {
              return html`
                <token-specimen
                  variant="opacity"
                  name="${item.name}"
                  value="${item.value}"
                  inlineStyles="opacity: var(${item.name});"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-1-opacity') === undefined) {
  customElements.define('tier-1-opacity', Tier1Opacity);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-1-opacity': Tier1Opacity;
  }
}
