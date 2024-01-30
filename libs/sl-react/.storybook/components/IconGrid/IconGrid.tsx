import '!style-loader!css-loader!sass-loader!./IconGrid.scss';
import React from 'react';
import PackageJson from '../../../package.json';

export interface NewComponentProps {
  /**
   * CSS class names that can be appended to the component.
   */
  styleModifier?: string;
  /**
   * Child node(s) that can be nested inside component
   */
  children?: React.ReactNode;
}

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
    <div>
      <ul className="icon-grid">
        {ALL_ICONS.map(function (item, index) {
          const TagName = createTagName();

          function createTagName() {
            return `sl-icon-${item.name}-${PackageJson.version.replace(/\./g, '-')}`;
          }
          return (
            <li className="icon-grid__item" key={`icon-grid-item-${index}`}>
              <TagName />
              <span className="icon-grid__text">
                {'<'}ENIcon{toPascalCase(item.name)} {'/>'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
