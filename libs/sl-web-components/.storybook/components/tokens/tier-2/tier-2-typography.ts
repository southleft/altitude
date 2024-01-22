import { html, LitElement, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import '../../token-specimen/token-specimen';
import styles from '../tokens.scss';

export class Tier2Typography extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @property()
  accessor tokens: Object = {
    'theme-typography-body-xs': 'sl-typography-preset-1-bold',
    'theme-typography-body-xs-bold': 'sl-typography-preset-1',
    'theme-typography-body-sm': 'sl-typography-preset-2',
    'theme-typography-body-sm-bold': 'sl-typography-preset-2-bold',
    'theme-typography-body-md': 'sl-typography-preset-3',
    'theme-typography-body-md-bold': 'sl-typography-preset-3-bold',
    'theme-typography-body-lg': 'sl-typography-preset-4',
    'theme-typography-body-lg-bold': 'sl-typography-preset-4-bold',
    'theme-typography-heading-sm': 'sl-typography-preset-5',
    'theme-typography-heading-sm-bold': 'sl-typography-preset-5-bold',
    'theme-typography-heading-md': 'sl-typography-preset-6',
    'theme-typography-heading-md-bold': 'sl-typography-preset-6-bold',
    'theme-typography-heading-lg': 'sl-typography-preset-7',
    'theme-typography-heading-lg-bold': 'sl-typography-preset-7-bold',
    'theme-typography-display-sm': 'sl-typography-preset-8',
    'theme-typography-display-sm-bold': 'sl-typography-preset-8-bold',
    'theme-typography-display-md': 'sl-typography-preset-9',
    'theme-typography-display-md-bold': 'sl-typography-preset-9-bold',
    'theme-typography-display-lg': 'sl-typography-preset-10',
    'theme-typography-display-lg-bold': 'sl-typography-preset-10-bold',
  };

  filterTokens(prefix) {
    return Object.entries(this.tokens)
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
            Typography Presets
          </caption>
          <thead>
            <tr>
              <th>Include</th>
              <th>Mapping</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('theme-typography').map((item) => {
              return html`
                <token-specimen variant="typography" name="@include sl-${item.name};" value="${item.value}" exampleClass="sl-u-${item.name}"
                  >Aa</token-specimen
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
