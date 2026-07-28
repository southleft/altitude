import './IconSvgs.scss?inline';
import React from 'react';
import PackageJson from '../../../package.json';

// WAS `require.context('…/components/icon/icons', false, /\.ts$/)` — a
// webpack-only API. The builder is `@storybook/react-vite`, so this threw
// `ReferenceError: require is not defined` at module scope and took the whole
// story file with it. `import.meta.glob` is Vite's equivalent.
//
// It points at `dist/` rather than at the TypeScript sources: a glob puts
// every match into the Rollup graph, and al-react's Vite has no decorator
// transform for al-web-components' `@property accessor` source (globbing the
// `.ts` files fails the preview build with "Unexpected token `ident`" on
// `accessor iconTitle`). The built `.js` is what every icon wrapper already
// imports, and `.storybook/main.ts` already guards on al-web-components being
// built.
//
// KNOWN GAP, pre-existing and NOT introduced here: the "Example" column renders
// `<al-icon-<name>-1-0-0>` tags, but only al-react's wrappers call
// `register({ suffix: PackageJson.version })` for those versioned names, and
// neither this glob nor webpack's `require.context` EXECUTES the modules it
// lists. So on a cold load of this story alone the 37 example cells are empty.
// An eager glob of `src/components/Icons/*/*.tsx` for the registration side
// effect was tried and is tree-shaken out of the production preview bundle;
// making the column paint needs a real fix in how the wrappers are imported.
const ALL_ICONS = Object.keys(
  import.meta.glob('../../../../al-web-components/dist/components/icon/icons/*.js')
)
  .map((path) => {
    const match = path.match(/\/([^/]*)\.js$/);
    return { name: match ? match[1] : '' };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

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
