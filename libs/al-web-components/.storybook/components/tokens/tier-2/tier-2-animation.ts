import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';

export class Tier2Animation extends LitElement {
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
          <h1>Tier 2: Animation</h1>
        </header>
        <table>
          <caption>
            <h2>Duration</h2>
            <p>By defining standardized durations for motion effects and transitions, developers can maintain a cohesive and unified user experience across different interface elements and interactions.</p>
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('al-theme-animation-duration').map((item) => {
              return html`
                <token-specimen
                  styleModifier="token-specimen--animation"
                  variant="animation"
                  name="var(${item.name})"
                  value="${item.value}"
                  inlineStyles="transition: all var(${item.name}) var(--al-theme-animation-timing);"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption>
            <h2>Timing</h2>
            <p>By establishing consistent timing values, developers can create harmonious and predictable animation sequences that feel cohesive and polished.</p>
          </caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('al-theme-animation-timing').map((item) => {
              return html`
                <token-specimen
                  styleModifier="token-specimen--animation"
                  variant="animation"
                  name="var(${item.name})"
                  value="${item.value}"
                  inlineStyles="transition: all var(--al-theme-animation-duration) var(${item.name});"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-2-animation') === undefined) {
  customElements.define('tier-2-animation', Tier2Animation);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-2-animation': Tier2Animation;
  }
}