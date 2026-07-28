import './IconFont.scss?inline';
import React from 'react';
// WAS `require('!!raw-loader!…iconfont.css').default` — a webpack inline-loader
// specifier. The builder is `@storybook/react-vite`, so there is no `require`
// in the preview bundle and this story threw `ReferenceError: require is not
// defined` on render. `?raw` is Vite's equivalent.
import IconCss from '../../../../al-web-components/components/icon/fonts/iconfont.css?raw';

class IconFont extends React.Component {
  getIconMap() {
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
      <tr key={item.name}>
        <td><code>icon-{item.name}</code></td>
        <td><code>{item.code.replace(`\\`, '\\u')}</code></td>
        <td><code>{item.code.replace(`\\`, '&#x') + ';'}</code></td>
        <td>{item.name}</td>
        <td><div className={`icon icon-${item.name}`}></div></td>
      </tr>
    ));
  }

  render() {
    const iconMap = this.getIconMap();
    return (
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
            {this.renderIconList(iconMap)}
          </tbody>
        </table>
      </section>
    );
  }
}

export default IconFont;
