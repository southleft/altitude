import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import '../../token-specimen/token-specimen';
import styles from '../tokens.scss';

export class Tier1Breakpoints extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  filterTokens(prefix) {
    return Object.entries(tokens)
      .filter(([name]) => name.startsWith(prefix))
      .map(([name, value]) => ({
        name: `$${name}`,
        value
      }));
  }

  render() {
    return html`
      <section>
        <header>
          <h1>Tier 1: Breakpoints</h1>
        </header>
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-breakpoint').map((item) => {
              return html` <token-specimen name="${item.name}" value="${item.value}"></token-specimen> `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-1-breakpoints') === undefined) {
  customElements.define('tier-1-breakpoints', Tier1Breakpoints);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-1-breakpoints': Tier1Breakpoints;
  }
}
