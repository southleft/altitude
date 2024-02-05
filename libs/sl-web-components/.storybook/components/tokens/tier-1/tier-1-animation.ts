import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';
import '../../../../components/alert/alert';

export class Tier1Animation extends LitElement {
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
          <h1>Tier 1: Animation</h1>
          <sl-alert ?isActive=${true} variant="warning">IMPORTANT: Avoid direct usage of Tier 1 tokens in code. Tier 2 tokens must exclusively reference Tier 1 tokens.</sl-alert>
        </header>
        <table>
          <caption><h2>Duration</h2></caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-animation-duration').map((item) => {
              return html`
                <token-specimen
                  styleModifier="token-specimen--animation"
                  variant="animation"
                  name="${item.name}"
                  value="${item.value}"
                  inlineStyles="transition: all var(${item.name}) ease;"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption><h2>Timing</h2></caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('sl-animation-timing').map((item) => {
              return html`
                <token-specimen
                  styleModifier="token-specimen--animation"
                  variant="animation"
                  name="${item.name}"
                  value="${item.value}"
                  inlineStyles="transition: all 0.4s var(${item.name});"
                ></token-specimen>
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-1-animation') === undefined) {
  customElements.define('tier-1-animation', Tier1Animation);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-1-animation': Tier1Animation;
  }
}
