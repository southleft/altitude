import { html, LitElement, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './icon-font.scss';
import '../token-code/token-code';

@customElement('icon-font')
export class IconFont extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  getIconMap(): { name: string; code: string }[] {
    const IconCss = require('!!raw-loader!../../../components/icon/fonts/iconfont.css').default;
    return IconCss.match(/\.icon-[^\}]+\}/g).map((icon) => {
      const iconCode = icon.match(/content: "(.*?)";/) || icon.match(/content: '(.*?)';/);
      return {
        name: icon.match(/\.icon-(.*?):/)[1],
        code: iconCode[1],
      };
    });
  }

  renderIconList(iconMap: { name: string; code: string }[]) {
    return iconMap.map((item) => {
      return html`
        <token-specimen
          variant="icon"
          name="icon-${item.name}"
          value="${item.name}"
          codeUnicode="${item.code.replace(`\\`, '\\u')}"
          codeHtml="${item.code.replace(`\\`, '&#x') + ';'}"
          exampleClass="icon"
        >
          <div class="icon icon-${item.name}"></div>
        </token-specimen>
      `;
    });
  }

  render() {
    const iconMap = this.getIconMap();
    return html`
      <section>
        <header>
          <h1>Icon Font</h1>
          <p>Icon names should accurately describe the represented concept or action in a clear and intuitive manner. Avoid obscure or ambiguous names that could lead to confusion or misinterpretation.</p>
        </header>
        <table>
          <caption><h2>Sizes</h2></caption>
          <thead>
            <tr>
              <th>Utility Class</th>
              <th>Unicode</th>
              <th>HTML</th>
              <th>Name</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            ${this.renderIconList(iconMap)}
          </tbody>
        </table>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'icon-font': IconFont;
  }
}
