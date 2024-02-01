import { html, LitElement, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './icon-font.scss';

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
      return html`<li class="icon-font__item">
        <div class="icon icon-${item.name}"></div>
        <div class="icon-font__text">
          icon-${item.name}<br />
          <span class="icon-font__text-unicode">
            <strong>unicode:</strong> <code>${item.code.replace(`\\`, '\\u')}</code>
          </span>
          <span class="icon-font__text-unicode">
            <strong>html:</strong> <code>${item.code.replace(`\\`, '&#x') + ';'}</code>
          </span>
        </div>
      </li>`;
    });
  }

  render() {
    const iconMap = this.getIconMap();
    return html`
      <div class="icon-font">
        <header>
          <h1>Icon Font</h1>
          <p>Icon names should accurately describe the represented concept or action in a clear and intuitive manner. Avoid obscure or ambiguous names that could lead to confusion or misinterpretation.</p>
        </header>
          <ul class="icon-font__list">
            <slot>
              ${this.renderIconList(iconMap)}
            </slot>
          </ul>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'icon-font': IconFont;
  }
}
