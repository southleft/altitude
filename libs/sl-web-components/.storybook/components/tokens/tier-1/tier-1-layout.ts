import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';
import '../../../../components/alert/alert';

export class Tier1Layout extends LitElement {
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
          <h1>Tier 1: Layout</h1>
          <sl-alert ?isActive=${true} variant="warning">IMPORTANT: Avoid direct usage of Tier 1 tokens in code. Tier 2 tokens must exclusively reference Tier 1 tokens.</sl-alert>
        </header>
        <table>
          <caption>
            <h2>Max Widths</h2>
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-layout').map((item) => {
              return html` <token-specimen name="var(${item.name})" value="${item.value}" disableCopy=${true}></token-specimen> `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-1-layout') === undefined) {
  customElements.define('tier-1-layout', Tier1Layout);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-1-layout': Tier1Layout;
  }
}
