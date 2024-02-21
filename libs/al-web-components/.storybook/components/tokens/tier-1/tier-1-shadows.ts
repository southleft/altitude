import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';

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
          <al-alert ?isActive=${true} variant="warning">IMPORTANT: Avoid direct usage of Tier 1 tokens in code. Tier 2 tokens must exclusively reference Tier 1 tokens.</al-alert>
        </header>
        <table>
          <caption>
            <h2>Drop Shadows</h2>
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('al-box-shadow').map((item) => {
              return html`
                <token-specimen
                  variant="shadow"
                  name="var(${item.name})"
                  value="${item.value}"
                  inlineStyles="box-shadow: var(${item.name});"
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

if (customElements.get('tier-1-shadows') === undefined) {
  customElements.define('tier-1-shadows', Tier1Shadows);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-1-shadows': Tier1Shadows;
  }
}
