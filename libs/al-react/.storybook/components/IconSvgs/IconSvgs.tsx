import '!style-loader!css-loader!sass-loader!./IconSvgs.scss';
import React from 'react';
import PackageJson from '../../../package.json';

const ALL_ICONS = require
  .context('../../../../al-web-components/components/icon/icons', false, /\.ts$/)
  .keys()
  .map((path) => {
    const match = path.match(/\/(.*)\.ts$/);
    return { name: match ? match[1] : '' };
  });

export default function IconSvgs() {
  const toPascalCase = (text) => {
    return text.replace(/(^\w|-\w)/g, clearAndUpper);
  };
  const clearAndUpper = (text) => {
    return text.replace(/-/, '').toUpperCase();
  };

  return (
    <section>
      <header>
        <h1>Icon Svgs</h1>
        <p>Icon names should accurately describe the represented concept or action in a clear and intuitive manner. Avoid obscure or ambiguous names that could lead to confusion or misinterpretation.</p>
      </header>
      <table>
        <caption><h2>Sizes</h2></caption>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          {ALL_ICONS.map(function (item, index) {
            const TagName = createTagName();
            function createTagName() {
              return `al-icon-${item.name}-${PackageJson.version.replace(/\./g, '-')}`;
            }
            function renderIconTagName() {
              return '<ALIcon' + toPascalCase(item.name) + '></ALIcon' + toPascalCase(item.name) + '>';
            }
            return (
              <tr key={index}>
                <td><code>{renderIconTagName()}</code></td>
                <td>{item.name}</td>
                <td><TagName /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
