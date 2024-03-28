import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/dist/tokens.json';
import styles from '../tokens.scss';
import '../../token-specimen/token-specimen';
import '../../../../components/alert/alert';

export class Tier1Typography extends LitElement {
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

  filterType(prefix) {
    return Object.entries(tokens)
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
          <h1>Tier 1: Typography</h1>
          <al-alert ?isActive=${true} variant="warning">IMPORTANT: Avoid direct usage of Tier 1 tokens in code. Tier 2 tokens must exclusively reference Tier 1 tokens.</al-alert>
        </header>
        <table>
          <caption><h2>Typography Presets</h2></caption>
          <thead>
            <tr>
              <th>Include</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterType('al-typography-preset').map((item) => {
              return html`
                <token-specimen
                  variant="typography"
                  name="@include ${item.name};"
                  value="${item.value}"
                  exampleClass="${item.name}"
                  ?disableCopy=${true}
                >Lorem ipsum dolor sit amet, consectetur adipiscing elit.</token-specimen>
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption><h2>Font Families</h2></caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('al-font-family').map((item) => {
              return html`
                <token-specimen
                  variant="typography"
                  name="var(${item.name})"
                  value="${item.value}"
                  inlineStyles="font-family: var(${item.name});"
                  ?disableCopy=${true}
                >Lorem ipsum dolor sit amet, consectetur adipiscing elit.</token-specimen>
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption><h2>Font Sizes</h2></caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('al-font-size').map((item) => {
              return html`
                <token-specimen variant="typography" name="var(${item.name})" value="${item.value}" inlineStyles="font-size: var(${item.name});"
                  >Aa</token-specimen
                >
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption><h2>Line Heights</h2></caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('al-line-height').map((item) => {
              return html`
                <token-specimen variant="typography" name="var(${item.name})" value="${item.value}" inlineStyles="line-height: var(${item.name});"
                  >ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />abcdefghijklmnopqrstuvwxyz</token-specimen
                >
              `;
            })}
          </tbody>
        </table>

        <table>
          <caption><h2>Font Weights</h2></caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('al-font-weight').map((item) => {
              return html`
                <token-specimen variant="typography" name="var(${item.name})" value="${item.value}" inlineStyles="font-weight: var(${item.name});"
                  >Lorem ipsum dolor sit amet, consectetur adipiscing elit.</token-specimen
                >
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption><h2>Letter Spacing</h2></caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('al-letter-spacing').map((item) => {
              return html`
                <token-specimen variant="typography" name="var(${item.name})" value="${item.value}" inlineStyles="letter-spacing: var(${item.name});"
                  >Lorem ipsum dolor sit amet, consectetur adipiscing elit.</token-specimen
                >
              `;
            })}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (customElements.get('tier-1-typography') === undefined) {
  customElements.define('tier-1-typography', Tier1Typography);
}

declare global {
  interface HTMLElementTagNameMap {
    'tier-1-typography': Tier1Typography;
  }
}
