import '!style-loader!css-loader!sass-loader!./IconGrid.scss';
import React from 'react';
import PackageJson from '../../../package.json';

const ALL_ICONS = require
  .context('../../../../sl-web-components/components/icon/icons', false, /\.ts$/)
  .keys()
  .map((path) => {
    const match = path.match(/\/(.*)\.ts$/);
    return { name: match ? match[1] : '' };
  });

export default function IconGrid() {
  const toPascalCase = (text) => {
    return text.replace(/(^\w|-\w)/g, clearAndUpper);
  };
  const clearAndUpper = (text) => {
    return text.replace(/-/, '').toUpperCase();
  };

  return (
    <div className="icon-grid">
      <header>
        <h1>Icon Grid</h1>
      </header>
      <ul className="icon-grid__list">
        {ALL_ICONS.map(function (item, index) {
          const TagName = createTagName();

          function createTagName() {
            return `sl-icon-${item.name}-${PackageJson.version.replace(/\./g, '-')}`;
          }
          return (
            <li className="icon-grid__item" key={`icon-grid-item-${index}`}>
              <TagName />
              <span className="icon-grid__text">
                SLIcon{toPascalCase(item.name)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
