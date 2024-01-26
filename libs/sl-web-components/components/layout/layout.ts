import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import styles from './layout.scss';

/**
 * Component: sl-layout
 *
 * Layout provides a responsive structure for content that ensures consistency across an application.
 */
export class SLLayout extends SLElement {
  static el = 'sl-layout';

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
    const componentClassName = this.componentClassNames('sl-c-layout', {
      'sl-c-layout--sidebar-left': this.variant === 'sidebar-left',
      'sl-c-layout--sidebar-right': this.variant === 'sidebar-right',
      'sl-c-layout--gap-none': this.gap === 'none',
      'sl-c-layout--gap-sm': this.gap === 'sm',
      'sl-c-layout--gap-lg': this.gap === 'lg',
      'sl-c-layout--gap-xl': this.gap === 'xl'
    });

    return html`
      <div class="${componentClassName}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLLayout.el) === undefined) {
  customElements.define(SLLayout.el, SLLayout);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-layout': SLLayout;
  }
}
