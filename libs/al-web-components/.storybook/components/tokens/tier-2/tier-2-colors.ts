import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/dist/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';

export class Tier2Colors extends LitElement {
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
          <h1>Tier 2: Colors</h1>
          <p>Tier 2 tokens allow for adaptability and diversity in design while still maintaining a cohesive visual identity through adherence to the tier 1 tokens.</p>
        </header>
        <table>
          <caption>
            <h2>Background Colors</h2>
            <p>Used for the background of components, sections, or the entire interface. Ensure appropriate contrast with content colors for readability.</p>
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('al-theme-color-background').map((item) => {
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
            <h2>Content Colors</h2>
            <p>Applied to text, icons, and other content elements to convey information. Prioritize accessibility by ensuring sufficient contrast for text and interactive elements.</p>
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('al-theme-color-content').map((item) => {
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
            <h2>Shadow Colors</h2>
            <p>Shadow colors are instrumental in creating depth and dimension within the user interface. They are primarily utilized for drop shadows and text shadows, enhancing the visual hierarchy and providing a sense of elevation to elements.</p>
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('al-theme-color-shadow').map((item) => {
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
      </section>
    `;
  }
}

if (customElements.get('tier-2-colors') === undefined) {
  customElements.define('tier-2-colors', Tier2Colors);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-2-colors': Tier2Colors;
  }
}
