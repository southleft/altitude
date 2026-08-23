// MDX `file://` import resolver — SHARED Storybook build glue.
//
// Under pnpm's symlinked layout, `@storybook/addon-docs`'s MDX loader injects
// an import whose specifier is a `file:///…` absolute URL pointing into the
// pnpm virtual store:
//
//   import {useMDXComponents} from "file:///…/@storybook/addon-docs/dist/mdx-react-shim.js"
//
// Vite's import-analysis and Rollup cannot resolve `file:` URIs, so ANY .mdx
// file fails with "Failed to resolve import … Does the file exist?". This
// strips the prefix so an absolute filesystem path is seen instead.
//
// Two consumers, both Storybook configs:
//   * `libs/al-web-components/.storybook/main.ts`
//   * `libs/al-react/.storybook/main.ts`  — needed there as soon as that
//     Storybook started indexing the shared `Resources/*` MDX pages.
//
// Lives here rather than in either `.storybook/` folder so neither copy can
// drift, matching `./rewrite-scss-imports.mjs`.

import { fileURLToPath } from 'node:url';

export function mdxFileUrlResolver() {
  return {
    name: 'al-mdx-file-url-resolver',
    enforce: 'pre',
    resolveId(id) {
      if (typeof id === 'string' && id.startsWith('file://')) return fileURLToPath(id);
      return null;
    },
  };
}
