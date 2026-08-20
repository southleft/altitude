// Base-path-aware internal links — spec 2026-08-20-southleft-example-app, T1/T3.
//
// The monorepo publishes every example app under its own subpath
// (astro.config.mjs: `base: '/southleft'`), mirroring apps/astro. Every
// INTERNAL, root-relative href in this app (nav, cards, breadcrumbs, CTAs)
// has to carry that prefix or navigation breaks under the shared `/dist`.
// `withBase()` is the one place that happens, so go-live (dropping `base`
// back to '/' once this becomes the real southleft.com) is a one-line
// astro.config.mjs change, not a site-wide find/replace.
export function withBase(pathname: string): string {
  if (/^https?:\/\//.test(pathname) || pathname.startsWith('mailto:') || pathname.startsWith('#')) {
    return pathname;
  }
  const base = import.meta.env.BASE_URL ?? '/';
  return base.replace(/\/$/, '') + pathname;
}
