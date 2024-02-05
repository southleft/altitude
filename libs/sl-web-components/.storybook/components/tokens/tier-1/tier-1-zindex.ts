import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';

export class Tier1Zindex extends LitElement {
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
          <h1>Tier 1: Zindex</h1>
        </header>
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-z-index').map((item) => {
              return html` <token-specimen name="${item.name}" value="${item.value}"></token-specimen> `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-1-zindex') === undefined) {
  customElements.define('tier-1-zindex', Tier1Zindex);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-1-zindex': Tier1Zindex;
  }
}
