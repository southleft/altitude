import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';

export class Tier2Typography extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  filterTokens(prefix) {
    return Object.entries(tokens)
      .filter(([name]) => name.startsWith(prefix))
      .map(([name, value]) => ({
        name: `${name}`,
        value
      }));
  }

  render() {
    return html`
      <section>
        <header>
          <h1>Tier 2: Typography</h1>
        </header>
        <table>
          <caption>
            Typography Usage
          </caption>
          <thead>
            <tr>
              <th>Include</th>
              <th>Utility Class</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-theme-typography').map((item) => {
              return html`
                <token-specimen variant="typography" name="@include ${item.name};" value=".${item.name}" exampleClass="${item.name}"
                  >Lorem ipsum dolor sit amet, consectetur adipiscing elit.</token-specimen
                >
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-2-typography') === undefined) {
  customElements.define('tier-2-typography', Tier2Typography);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-2-typography': Tier2Typography;
  }
}
