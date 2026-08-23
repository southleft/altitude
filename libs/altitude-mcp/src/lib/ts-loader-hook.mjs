// Custom ESM resolve hook (Node's `module.register()` API) used ONLY as the
// FALLBACK path for loading the theme engine from TypeScript source
// (libs/al-web-components/theme-engine/*.ts), when `dist/theme-engine/
// index.js` has not been built. See `./theme.mjs` for why both paths exist.
//
// Those files are plain TypeScript with erasable syntax only (interfaces,
// type-only imports, no enums/namespaces/decorators), so Node's built-in
// type-stripping loader (unflagged on Node >=22.18, or via
// `--experimental-strip-types` on earlier 22.x patches) can run them
// directly with no build step. The one gap: their relative imports omit
// extensions (`from './oklch'`), which TypeScript's own resolver allows but
// Node's ESM resolver does not. This hook closes that gap by retrying a
// failed relative resolution with a `.ts` extension appended — nothing else.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err?.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw err;
  }
}
