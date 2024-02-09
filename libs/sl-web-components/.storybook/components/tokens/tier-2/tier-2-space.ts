import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';
import '../../f-po/f-po';

export class Tier2Space extends LitElement {
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
          <h1>Tier 2: Space</h1>
        </header>
        <table>
          <caption>
            <h2>Sizes</h2>
            <p>Space tokens ensure consistency and cohesion across the user interface by defining standardized intervals for padding, margin, and gap.</p>
          </caption>
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
                  name="var(${item.name})"
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

if (customElements.get('tier-2-space') === undefined) {
  customElements.define('tier-2-space', Tier2Space);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-2-space': Tier2Space;
  }
}
