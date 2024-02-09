import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';

export class Tier2Border extends LitElement {
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
          <h1>Tier 2: Borders</h1>
        </header>
        <table>
          <caption>
            <h2>Border Colors</h2>
            <p>Border colors help distinguish between different interface elements, providing visual cues that aid in navigation and comprehension. By using distinct border colors, designers can create clear distinctions between interactive elements, such as buttons, input fields, and clickable links.</p>
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('sl-theme-color-border').map((item) => {
              return html`
                <token-specimen
                  variant="color"
                  name="var(${item.name})"
                  value="${item.value}"
                  inlineStyles="background-color: var(${item.name});"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption>
            <h2>Border Width</h2>
            <p>Border width defines the thickness of borders around elements such as buttons, cards, input fields, and containers, contributing significantly to the visual hierarchy, structure, and overall aesthetics of the design.</p>
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-theme-border-width').map((item) => {
              return html`
                <token-specimen
                  variant="border"
                  name="var(${item.name})"
                  value="${item.value}"
                  inlineStyles="border-width: ${item.value};"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption>
            <h2>Border Radius</h2>
            <p>Border radius dictates the curvature of corners in these elements, playing a crucial role in shaping their visual appearance, feel, and overall aesthetics within the design system.</p>
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-theme-border-radius').map((item) => {
              return html`
                <token-specimen
                  variant="border"
                  name="var(${item.name})"
                  value="${item.value}"
                  inlineStyles="border-radius: ${item.value};"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-2-border') === undefined) {
  customElements.define('tier-2-border', Tier2Border);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-2-border': Tier2Border;
  }
}
