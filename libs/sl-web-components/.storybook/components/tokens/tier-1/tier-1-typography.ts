import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../../styles/tokens.json';
import '../../token-specimen/token-specimen';
import styles from '../tokens.scss';

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
          <p>These token values are the raw materials that make up the
          <a href="?path=/story/atoms-tokens-typography--presets">typography presets</a>. They are displayed here only for reference and are
          never used directly.</p>
        </header>
        <table>
          <caption>Typography Presets</caption>
          <thead>
            <tr>
              <th>Include</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterType('sl-typography-preset').map((item) => {
              return html`
                <token-specimen variant="typography" name="@include ${item.name};" exampleClass="${item.name}"
                  >Lorem ipsum dolor sit amet, consectetur adipiscing elit.</token-specimen
                >
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption>Font Families</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('sl-font-family').map((item) => {
              return html`
                <token-specimen variant="typography" name="${item.name}" value="${item.value}" inlineStyles="font-family: var(${item.name});"
                  >Lorem ipsum dolor sit amet, consectetur adipiscing elit.</token-specimen
                >
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption>Font Sizes</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('sl-font-size').map((item) => {
              return html`
                <token-specimen variant="typography" name="${item.name}" value="${item.value}" inlineStyles="font-size: var(${item.name});"
                  >Aa</token-specimen
                >
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption>Line Heights</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('sl-line-height').map((item) => {
              return html`
                <token-specimen variant="typography" name="${item.name}" value="${item.value}" inlineStyles="line-height: var(${item.name});"
                  >ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />abcdefghijklmnopqrstuvwxyz</token-specimen
                >
              `;
            })}
          </tbody>
        </table>

        <table>
          <caption>Font Weights</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('sl-font-weight').map((item) => {
              return html`
                <token-specimen variant="typography" name="${item.name}" value="${item.value}" inlineStyles="font-weight: var(${item.name});"
                  >Lorem ipsum dolor sit amet, consectetur adipiscing elit.</token-specimen
                >
              `;
            })}
          </tbody>
        </table>
        <table>
          <caption>Letter Spacing</caption>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody></tbody>
            ${this.filterTokens('sl-letter-spacing').map((item) => {
              return html`
                <token-specimen variant="typography" name="${item.name}" value="${item.value}" inlineStyles="letter-spacing: var(${item.name});"
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
