import { TemplateResult, unsafeCSS } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALPopover } from '../popover/popover';
import { ALButton } from '../button/button';
import { ALMenu } from '../menu/menu';
import { ALMenuItem } from '../menu-item/menu-item';
import { ALIconSettings } from '../icon/icons/settings';
import styles from './theme-switcher.scss';
// T4.5 — legacy stylesheet imports retained for the DEPRECATED global-swap
// fallback (removal target 3.0.0; see MIGRATION.md § "Legacy fallback").
// Reachable only when the switcher finds no <al-theme> ancestor.
// `apps/web-components/index.html` is the remaining in-repo consumer.
import tokensAltitudeDark from '../../styles/dist/scss/brand/tokens-altitude-dark.scss';
import tokensAltitudeLight from '../../styles/dist/scss/brand/tokens-altitude-light.scss';
import tokensSouthleft from '../../styles/dist/scss/brand/tokens-southleft-dark.scss';

/**
 * T4.5 — data-driven brand list. Adding a brand here is a config edit; the
 * component code does not change.
 *
 * Each entry maps a brand+mode tuple to (a) the legacy CSS token blob (for
 * `dual` fallback) and (b) the attributes to set on the nearest
 * `<al-theme>` host (for scoped consumers).
 */
type ThemeKey =
  | 'dark'
  | 'light'
  | 'southleft';

interface BrandEntry {
  key: ThemeKey;
  label: string;
  legacyTokens: string;
  /** Attributes to set on the nearest `<al-theme>` ancestor. */
  themeAttrs: {
    brand: string;
    mode: 'light' | 'dark';
  };
  /** Optional logo identifier for analytics / brand mark. */
  logo?: string;
}

const BRANDS: BrandEntry[] = [
  { key: 'dark', label: 'Theme: Dark', legacyTokens: tokensAltitudeDark, themeAttrs: { brand: 'altitude', mode: 'dark' } },
  { key: 'light', label: 'Theme: Light', legacyTokens: tokensAltitudeLight, themeAttrs: { brand: 'altitude', mode: 'light' } },
  { key: 'southleft', label: 'Brand: Southleft', legacyTokens: tokensSouthleft, themeAttrs: { brand: 'southleft', mode: 'dark' }, logo: 'southleft' },
];

/**
 * Component: al-theme-switcher
 * @slot - The component content
 *
 * @event onThemeSwitcherChange - Fired when the theme changes. Detail: `{ currentTheme, currentLogo, scoped }` — `scoped` is `true` when an ancestor `<al-theme>` was found and updated, `false` when the deprecated global swap was used.
 */
export class ALThemeSwitcher extends ALElement {
  static el = 'al-theme-switcher';

  /**
   * When true, do not perform the legacy global `<style>` swap.
   *
   * @deprecated The swap it disables is itself deprecated (removal target
   * 3.0.0). Wrapping content in `<al-theme>` makes both this flag and the swap
   * irrelevant — the scoped path is taken automatically, and since
   * `2026-07-28-scoped-token-emission-brand-wiring` it moves `brand` as well as
   * `mode`. See MIGRATION.md § "Legacy fallback".
   */
  scopedOnly = false;

  private elementMap = register({
    elements: [
      [ALPopover.el, ALPopover],
      [ALButton.el, ALButton],
      [ALMenu.el, ALMenu],
      [ALMenuItem.el, ALMenuItem],
      [ALIconSettings.el, ALIconSettings],
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private popoverEl = unsafeStatic(this.elementMap.get(ALPopover.el));
  private buttonEl = unsafeStatic(this.elementMap.get(ALButton.el));
  private menuEl = unsafeStatic(this.elementMap.get(ALMenu.el));
  private menuItemEl = unsafeStatic(this.elementMap.get(ALMenuItem.el));
  private iconSettingsEl = unsafeStatic(this.elementMap.get(ALIconSettings.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Set theme by key. The data-driven implementation:
   *
   *   1. Walk up the DOM until we find an `<al-theme>` ancestor (the scoped
   *      target). When present, set `brand` and `mode` attributes on it —
   *      no global mutation.
   *
   *   2. If no `<al-theme>` ancestor exists AND `scopedOnly` is false,
   *      perform the legacy `<style id="al-tokens-sheet">` swap. DEPRECATED,
   *      removal target 3.0.0 — kept because `apps/web-components/index.html`
   *      uses the switcher with no wrapper. See MIGRATION.md § "Legacy
   *      fallback".
   *
   *   3. Dispatch `onThemeSwitcherChange` with the resolved attrs.
   */
  setTheme(key: ThemeKey) {
    const entry = BRANDS.find((b) => b.key === key);
    if (!entry) return;

    /* 1 — scoped path */
    const themeHost = this.closest('al-theme');
    if (themeHost) {
      themeHost.setAttribute('brand', entry.themeAttrs.brand);
      themeHost.setAttribute('mode', entry.themeAttrs.mode);
    }

    /* 2 — legacy `dual` fallback */
    if (!themeHost && !this.scopedOnly) {
      const existingStyles = document.querySelectorAll('style[type="text/css"]');
      existingStyles.forEach((style) => {
        if (style.id === 'al-tokens-sheet') style.remove();
      });
      const themeStyleElement = document.createElement('style');
      themeStyleElement.innerHTML = entry.legacyTokens;
      themeStyleElement.setAttribute('type', 'text/css');
      themeStyleElement.setAttribute('id', 'al-tokens-sheet');
      document.head.appendChild(themeStyleElement);
    }

    /* 3 — dispatch */
    this.dispatch({
      eventName: 'onThemeSwitcherChange',
      detailObj: {
        currentTheme: key,
        currentLogo: entry.logo,
        scoped: Boolean(themeHost),
      }
    });
  }

  /** Backward-compatible alias. Delete once T6.1 codemods consumers. */
  setStyles(key: ThemeKey) { this.setTheme(key); }

  render() {
    const componentClassNames = this.componentClassNames('al-c-theme-switcher', { });

    return html`
      <${this.popoverEl} class="${componentClassNames}" variant="menu">
        <${this.buttonEl} slot="trigger" hideText={true} variant="bare"><${this.iconSettingsEl} slot="before"></${this.iconSettingsEl}>Settings</${this.buttonEl}>
        <${this.menuEl}>
          ${BRANDS.map(
            (b) =>
              html`<${this.menuItemEl} @click=${() => this.setTheme(b.key)}>${b.label}</${this.menuItemEl}>`
          )}
        </${this.menuEl}>
      </${this.popoverEl}>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALThemeSwitcher.el) === undefined) {
  customElements.define(ALThemeSwitcher.el, ALThemeSwitcher);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-theme-switcher': ALThemeSwitcher;
  }
}
