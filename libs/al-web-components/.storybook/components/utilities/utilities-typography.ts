import { html, LitElement, unsafeCSS } from 'lit';
import tokens from '../../../styles/tokens.json';
import styles from './utilities.scss';
import '../token-specimen/token-specimen';

export class UtilitiesTypography extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  filterTokens(prefix) {
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
          <h1>Utilities: Typography</h1>
        </header>
        <table>
          <caption>
            <h2>Typography</h2>
            <p>Typography utility classes provide a set of predefined styles for text elements, allowing developers to apply consistent typography across their web projects. These classes are designed to enhance readability and maintain consistency in text formatting.</p>
          </caption>
          <thead>
            <tr>
              <th>Utility Class</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.filterTokens('al-theme-typography').map((item) => {
              return html`
                <token-specimen
                  variant="typography"
                  name="${item.name.replace('al-theme-', 'al-u-theme-')}"
                  exampleClass="${item.name.replace('al-theme-', 'al-u-theme-')}"
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

if (customElements.get('utilities-typography') === undefined) {
  customElements.define('utilities-typography', UtilitiesTypography);
}

declare global {
  interface HTMLElementTagNameMap {
    'utilities-typography': UtilitiesTypography;
  }
}
