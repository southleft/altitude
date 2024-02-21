import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './layout.scss';

/**
 * Component: al-layout
 *
 * Layout provides a responsive structure for content that ensures consistency across an application.
 */
export class ALLayout extends ALElement {
  static el = 'al-layout';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Gap variant (Default is 16px)
   * - **none** yields a layout whose layout sections are spaced without any gutter in between on large screens.
   * - **sm** yields a layout whose layout sections are spaced 8px apart on large screens. Small screens gutters move to 16px between.
   * - **lg** yields a layout whose layout sections are spaced 24px apart on large screens. Small screens gutters move to 16px between.
   * - **xl** yields a layout whose layout sections are spaced 32px apart on large screens. Small screens gutters move to 16px between.
   */
  @property()
  accessor gap: 'none' | 'sm' | 'lg' | 'xl';

  /**
   *  Style variants
   * - **sidebar-left** formats the first `layout-section` component as a left sidebar
   * - **sidebar-right** formats the second `layout-section` component as a right sidebar
   */
  @property()
  accessor variant: 'sidebar-left' | 'sidebar-right';

  render() {
    const componentClassName = this.componentClassNames('al-c-layout', {
      'al-c-layout--sidebar-left': this.variant === 'sidebar-left',
      'al-c-layout--sidebar-right': this.variant === 'sidebar-right',
      'al-c-layout--gap-none': this.gap === 'none',
      'al-c-layout--gap-sm': this.gap === 'sm',
      'al-c-layout--gap-lg': this.gap === 'lg',
      'al-c-layout--gap-xl': this.gap === 'xl'
    });

    return html`
      <div class="${componentClassName}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALLayout.el) === undefined) {
  customElements.define(ALLayout.el, ALLayout);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-layout': ALLayout;
  }
}
