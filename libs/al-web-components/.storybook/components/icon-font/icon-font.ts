import { html, LitElement, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './icon-font.scss';
import IconCss from '../../../components/icon/fonts/iconfont.css?raw';
import '../token-code/token-code';

@customElement('icon-font')
export class IconFont extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  getIconMap(): { name: string; code: string }[] {
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
      const unicode = item.code.replace(`\\`, '\\u');
      const htmlEntity = item.code.replace(`\\`, '&#x') + ';';
      return html`
        <tr class="token-specimen token-specimen--icon">
          <td><token-code value="icon-${item.name}"></token-code></td>
          <td><token-code value="${unicode}"></token-code></td>
          <td><token-code value="${htmlEntity}"></token-code></td>
          <td>${item.name}</td>
          <td class="token-specimen__example">
            <div class="icon"><div class="icon icon-${item.name}"></div></div>
          </td>
        </tr>
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
