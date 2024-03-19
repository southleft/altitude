import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/dist/tokens.json';
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
            <h2>Typography Usage</h2>
            <p> Leverage the type mixins below to achieve modular and reusable typography styles throughout the codebase.</p>
          </caption>
          <thead>
            <tr>
              <th>Include</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('al-theme-typography').map((item) => {
              return html`
                <token-specimen variant="typography" name="@include ${item.name};" exampleClass="${item.name.replace('al-theme-', 'al-u-theme-')}"
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
