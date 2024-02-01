import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';
import '../../../../components/icon/icons/add';

export class Tier2Icons extends LitElement {
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
          <h1>Tier 2: Icons</h1>
        </header>
        <table>
          <caption>
            <h2>Sizes</h2>
            <p>Consistent icon sizes help establish visual harmony and predictability within the user interface. Users become accustomed to certain icon dimensions, making it easier for them to navigate and understand the interface intuitively.</p>
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-theme-icon').map((item) => {
              return html`
                <token-specimen
                  variant="icon"
                  name="${item.name}"
                  value="${item.value}"
                  inlineStyles="--sl-icon-width: ${item.value}; --sl-icon-height: ${item.value};"
                >
                  <sl-icon-add></sl-icon-add>
                </token-specimen>
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-2-icons') === undefined) {
  customElements.define('tier-2-icons', Tier2Icons);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-2-icons': Tier2Icons;
  }
}
