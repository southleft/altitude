import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';
import '../../../../components/alert/alert';

export class Tier1Border extends LitElement {
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
          <h1>Tier 1: Border</h1>
          <al-alert ?isActive=${true} variant="warning">IMPORTANT: Avoid direct usage of Tier 1 tokens in code. Tier 2 tokens must exclusively reference Tier 1 tokens.</al-alert>
        </header>
        <table>
          <caption><h2>Border Width</h2></caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('al-border-width').map((item) => {
              return html`
                <token-specimen
                  variant="border"
                  name="var(${item.name})"
                  value="${item.value}"
                  inlineStyles="border-width: var(${item.name});"
                  ?disableCopy=${true}
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption><h2>Border Radius</h2></caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('al-border-radius').map((item) => {
              return html`
                <token-specimen
                  variant="border"
                  name="var(${item.name})"
                  value="${item.value}"
                  inlineStyles="border-radius: var(${item.name});"
                  ?disableCopy=${true}
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-1-border') === undefined) {
  customElements.define('tier-1-border', Tier1Border);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-1-border': Tier1Border;
  }
}
