import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
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
import tokensDark from '../../styles/dist/scss/theme/tokens-dark.scss';
import tokensLight from '../../styles/dist/scss/theme/tokens-light.scss';
import tokensAltitude from '../../styles/dist/scss/brand/tokens-altitude.scss';
import tokensSouthleft from '../../styles/dist/scss/brand/tokens-southleft.scss';
import tokensNorthright from '../../styles/dist/scss/brand/tokens-northright.scss';

/**
 * Component: al-theme-switcher
 * - **slot**: The component content
 */
export class ALThemeSwitcher extends ALElement {
  static el = 'al-theme-switcher';

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

  @property()
  accessor currentTheme: string;

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  appendStyleSheet(theme: string) {
    // Remove existing styles that don't match the current theme
    const existingStyles = document.querySelectorAll('style[type="text/css"]');
    existingStyles.forEach((style) => {
      if (style.id == 'al-tokens-sheet') {
        style.remove();
      }
    });

    let themeStyles;
    if (theme == 'dark') {
      themeStyles = tokensDark;
    } else if (theme == 'light') {
      themeStyles = tokensLight;
    } else if (theme == 'altitude') {
      themeStyles = tokensAltitude;
    } else if (theme == 'northright') {
      themeStyles = tokensNorthright;
    } else if (theme == 'southleft') {
      themeStyles = tokensSouthleft;
    }

    const themeStyleElement = document.createElement('style');
    themeStyleElement.innerHTML = themeStyles;
    themeStyleElement.setAttribute('type', 'text/css');
    themeStyleElement.setAttribute('id', 'al-tokens-sheet');
    document.head.appendChild(themeStyleElement);

    // Set the current theme
    this.currentTheme = theme;
  };

  render() {
    const componentClassNames = this.componentClassNames('al-c-theme-switcher', { });

    return html`
      <${this.popoverEl} class="${componentClassNames}" variant="menu">
        <${this.buttonEl} slot="trigger" hideText={true} variant="tertiary"><${this.iconSettingsEl} slot="before"></${this.iconSettingsEl}>Settings</${this.buttonEl}>
        <${this.menuEl}>
          <${this.menuItemEl} @click=${() => this.appendStyleSheet('dark')}>Theme: Dark</${this.menuItemEl}>
          <${this.menuItemEl} @click=${() => this.appendStyleSheet('light')}>Theme: Light</${this.menuItemEl}>
          <${this.menuItemEl} @click=${() => this.appendStyleSheet('altitude')}>Brand: Altitude</${this.menuItemEl}>
          <${this.menuItemEl} @click=${() => this.appendStyleSheet('northright')}>Brand: Northright</${this.menuItemEl}>
          <${this.menuItemEl} @click=${() => this.appendStyleSheet('southleft')}>Brand: Southleft</${this.menuItemEl}>
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