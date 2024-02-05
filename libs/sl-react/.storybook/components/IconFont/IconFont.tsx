import '!style-loader!css-loader!sass-loader!./IconFont.scss';
import React from 'react';

class IconFont extends React.Component {
  getIconMap() {
    const IconCss = require('!!raw-loader!../../../../sl-web-components/components/icon/fonts/iconfont.css').default;
    return IconCss.match(/\.icon-[^\}]+\}/g).map((icon) => {
      const iconCode = icon.match(/content: "(.*?)";/) || icon.match(/content: '(.*?)';/);
      return {
        name: icon.match(/\.icon-(.*?):/)[1],
        code: iconCode[1],
      };
    });
  }

  renderIconList(iconMap) {
    return iconMap.map((item) => (
      <li key={item.name} className="icon-font__item">
        <div className={`icon icon-${item.name}`}></div>
        <div className="icon-font__text">
          icon-{item.name}<br />
          <span className="icon-font__text-unicode">
            <strong>unicode:</strong> <code>{item.code.replace(`\\`, '\\u')}</code>
          </span>
          <span className="icon-font__text-unicode">
            <strong>html:</strong> <code>{item.code.replace(`\\`, '&#x') + ';'}</code>
          </span>
        </div>
      </li>
    ));
  }

  render() {
    const iconMap = this.getIconMap();
    return (
      <div className="icon-font">
        <ul className="icon-font__list">
          {this.renderIconList(iconMap)}
        </ul>
      </div>
    );
  }
}

export default IconFont;
