import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';
import '../../../../components/alert/alert';

export class Tier1Colors extends LitElement {
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
          <h1>Tier 1: Colors</h1>
          <al-alert ?isActive=${true} variant="warning">IMPORTANT: Avoid direct usage of Tier 1 tokens in code. Tier 2 tokens must exclusively reference Tier 1 tokens.</al-alert>
          <p>Tier 1 colors form the core visual language of the design system and are consistently applied across various interfaces and components.</p>
        </header>
        <table>
          <caption>
            <h2>Brand Colors</h2>
            <p>Brand colors refer to a set of specific colors that are uniquely associated with a brand or organization. These colors are carefully chosen to reflect the brand's identity, values, and personality. They play a crucial role in maintaining a consistent and cohesive visual identity across various applications, marketing materials, and communication channels.</p>
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('al-color-brand').map((item) => {
              return html`
                <token-specimen
                  variant="color"
                  name="var(${item.name})"
                  value="${item.value}"
                  inlineStyles="background-color: var(${item.name});"
                  ?disableCopy=${true}
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption>
            <h2>Neutral Colors</h2>
            <p>Neutral colors apply to most backgrounds, text, and shapes in our experiences. While they don’t typically have a meaning associated with them, they can imply things like disabled states. There are dedicated neutral tonal palettes for both light mode and dark mode.</p>
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('al-color-neutral').map((item) => {
              return html`
                <token-specimen
                  variant="color"
                  name="var(${item.name})"
                  value="${item.value}"
                  inlineStyles="background-color: var(${item.name});"
                  ?disableCopy=${true}
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption>
            <h2>Transparent Colors</h2>
            <p>Transparent colors are used to create overlays, shadows, or to subtly blend elements into the background. They allow for visual hierarchy without obstructing underlying content, adding depth and dimension to the user interface. Transparent colors are particularly useful for modal dialogs, tooltips, and subtle effects, enhancing the overall user experience while maintaining clarity and legibility.</p>
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('al-color-transparent').map((item) => {
              return html`
                <token-specimen
                  variant="color"
                  name="var(${item.name})"
                  value="${item.value}"
                  inlineStyles="background-color: var(${item.name});"
                  ?disableCopy=${true}
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
            ${this.filterTokens('al-color-shadow').map((item) => {
              return html`
                <token-specimen
                  variant="color"
                  name="var(${item.name})"
                  value="${item.value}"
                  inlineStyles="background-color: var(${item.name});"
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

if (customElements.get('tier-1-colors') === undefined) {
  customElements.define('tier-1-colors', Tier1Colors);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-1-colors': Tier1Colors;
  }
}
