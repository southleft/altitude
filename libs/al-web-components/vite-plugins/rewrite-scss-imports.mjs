// SCSS import-rewrite plugin — SHARED build glue.
//
// Extracted from `vite.config.mjs` (where it was a private function) so the
// al-react Storybook can use the identical plugin instead of copying it. Two
// consumers today:
//   * `libs/al-web-components/vite.config.mjs`         — the library build
//   * `libs/al-react/.storybook/main.ts`               — so that Storybook can
//     compile the shared `Foundations/*` documentation elements, which live in
//     al-web-components source and use the bare-`.scss` import form
//
// WHAT IT DOES
// The component code uses `import styles from './x.scss'` and then
// `unsafeCSS(styles.toString())`. Under Vite, only the `?inline` query yields a
// raw CSS string; a bare `.scss` import is injected as a side effect and the
// default export is not the source text. Rather than edit every component, this
// rewrites the import IN MEMORY before esbuild parses the TS module.
//
// The trailing `.toString()` in the component stays legal: `?inline` resolves to
// a literal string, and strings have `toString()`.

export function rewriteScssImports() {
  const importRe = /(import\s+\w+\s+from\s+['"][^'"]+\.scss)(['"])/g;
  return {
    name: 'altitude-rewrite-scss',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.tsx?$/.test(id)) return null;
      if (!/\.scss['"]/.test(code)) return null;
      const out = code.replace(importRe, (m, before, quote) => `${before}?inline${quote}`);
      return out === code ? null : { code: out, map: null };
    },
  };
}
