// T4.2 — Scoped `<al-theme>` host component.
//
// Sets brand/mode/density/contrast tokens on `:host` (NOT on `:root`) so two
// `<al-theme>` subtrees with different brands compute distinct `--al-*`
// values on the same page. T4.3 removes the legacy `ALElement.getGlobalStyles`
// regex strip; T4.5 rewrites the theme-switcher to write into this element
// rather than mutate the global `<style>` element.
//
// Slots:
//   default — content the theme applies to.
//
// Attributes (axes per the plan):
//   brand=<id>           — selects the brand bundle to ingest.
//   mode=light|dark      — color mode.
//   density=compact|cozy|comfortable — spacing density axis (T4.4).
//   contrast=normal|more — contrast axis (T4.4). `more` raises
//     `theme.opacity.disabled` (0.4 -> 0.8, spec
//     2026-08-22-token-debt-and-machine-readable-metadata) so disabled
//     content clears WCAG AA text contrast (4.5:1) — a real low-vision
//     remedy, NOT a fix for the axe report's disabled-state findings, which
//     WCAG explicitly exempts from contrast requirements regardless (see
//     theme.scss's contrast-axis comment for the measured ratios and the
//     documented gap on `--al-theme-color-border-neutral-default`).
//   motion=full|reduced|expressive — respects prefers-reduced-motion if
//     absent; `expressive` lengthens/springs the role duration + easing
//     tokens (spec 2026-08-20-token-axes-expansion).
//   shape=default|sharp|pill — corner-radius axis: repoints the
//     `theme.border.radius.role.*` tokens (spec 2026-08-20-token-axes-expansion).
//
// Orthogonal axes: `shape`/`motion` set a FEEL, `density`/`contrast` set a FIT.
// A "recipe" is the combination — see `.altitude/AXES.md` — never a single
// attribute flip.
//
// There is no `brand` axis. A design system's LOOK is the token bundle the page
// loads, one file per system, exactly as a Figma file is one system. This
// component no longer carries a palette at all: it mirrors `mode` onto the host
// for the bundle's `[data-al-mode]` blocks to match, and owns only the axes that
// are genuinely axes rather than a second set of values.

import { html, css, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './theme.scss';

/**
 * Component: al-theme
 * @slot - The content tree the theme applies to.
 */
export class ALTheme extends ALElement {
  static el = 'al-theme';

  /**
   * Color mode.
   *
   * The VALUES no longer live in this component. They live in the design
   * system's own stylesheet (`@southleft/al-web-components/project/<id>.css`),
   * which carries `:root` for the default mode and `[data-al-mode='…']` for the
   * others — the same shape Figma uses, where one collection holds Light and
   * Dark as two modes of one system.
   *
   * This property is mirrored onto the host as `data-al-mode` so that stylesheet
   * matches. A data attribute rather than reusing `[mode]` directly, for two
   * reasons: the versioned registry renames the TAG (`al-theme-1-2-3`), so a
   * tag-qualified selector would stop matching; and a bare `[mode='light']` in a
   * global stylesheet would match unrelated elements. `data-al-mode` also means
   * a page can set a mode on `<html>` or any subtree with no component at all.
   */
  @property() accessor mode: 'light' | 'dark' = 'light';
  /** Density axis. */
  @property() accessor density: 'compact' | 'cozy' | 'comfortable' = 'comfortable';
  /** Contrast axis. */
  @property() accessor contrast: 'normal' | 'more' = 'normal';
  /**
   * Motion axis. Falls back to `prefers-reduced-motion` when unset.
   * `expressive` lengthens durations and swaps in springier easing on the
   * `theme.animation.{duration,timing}.role.*` tokens; `reduced` still wins
   * under `prefers-reduced-motion` unless `full` is set (accessibility-first
   * — `expressive` is a decorative upgrade, not an override of the OS
   * preference).
   */
  @property() accessor motion: 'full' | 'reduced' | 'expressive' | undefined;
  /**
   * Shape axis. Repoints the `theme.border.radius.role.*` tokens
   * (action/control/surface/indicator) that components map their
   * border-radius usage to. `default` (unset) reproduces today's per-brand
   * radii exactly — the role tokens resolve through the existing
   * `--al-theme-border-radius{,-lg,-round}` chain, so a brand's own radius
   * identity still shows through until `sharp`/`pill` overrides it.
   */
  @property() accessor shape: 'default' | 'sharp' | 'pill' | undefined;

  /**
   * Mirror `mode` onto the host so the project stylesheet's
   * `[data-al-mode='…']` block matches this element. Custom properties set
   * there inherit through the shadow boundary into every component below,
   * which is what makes a SUBTREE themeable without the palette living here.
   */
  updated(changed: Map<string, unknown>) {
    super.updated(changed as never);
    if (changed.has('mode') || !this.hasAttribute('data-al-mode')) {
      this.setAttribute('data-al-mode', this.mode);
    }
  }

  static get styles() {
    return [
      unsafeCSS(styles.toString()),
      css`
        @layer al.theme {
          :host { display: contents; }
        }
      `,
    ];
  }

  render() {
    return html`<slot></slot>`;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALTheme.el) === undefined) {
  customElements.define(ALTheme.el, ALTheme);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-theme': ALTheme;
  }
}
