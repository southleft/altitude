import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { SLElement } from '../SLElement';
import styles from './link.scss';

/**
 * Component: sl-link
 * - A link can be a standalone item, and it can be an in-line text link. But it will always be formatted with the same styles.
 * @slot - The components content
 */
export class SLLink extends SLElement {
  static el = 'sl-link';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * The link URL
   */
  @property()
  accessor href: string;

  /**
   * Variant
   * - **default** renders a link with the sl-theme-typography-body-md preset
   * - **xs** renders a link with the sl-theme-typography-body-xs preset
   * - **sm** renders a link with the sl-theme-typography-body-sm preset
   * - **lg** renders a link with the sl-theme-typography-body-lg preset
   * </cat-text-passage>
   */
  @property()
  accessor variant: 'xs' | 'sm' | 'lg';

  /**
   * Target attribute for a link (i.e. set to _blank to open in new tab)
   * - **_blank** yields a link that opens in a new tab
   * - **_self** yields a link that loads the URL into the same browsing context as the current one. This is the default behavior
   * - **_parent** yields a link that loads the URL into the parent browsing context of the current one. If there is no parent, this behaves the same way as _self
   * - **_top** yields a link that loads the URL into the top-level browsing context. If there is no parent, this behaves the same way as _self.
   */
  @property()
  accessor target: '_blank' | '_self' | '_parent' | '_top';

  /**
   * Aria label attribute
   * - Optional aria-label for a11y
   * - Most screen readers will read out loud the aria-label attribute in place of the link text. This is used for links that have text such as 'Learn more' or 'Read more'.
   */
  @property()
  accessor label: string;

  /**
   * Aria Labelled By attribute
   * - Optional aria-labelledby for a11y
   * - There may be instances where a nearby headline can act is the perfect label for a general link.
   */
  @property()
  accessor ariaLabelledBy: string;

  /**
   * Title attribute
   * - Optional title for a11y
   * - If a link opens a new window or performs an action, use the title attribute to provide a tooltip with additional information.
   */
  @property()
  accessor linkTitle: string;

  /**
   * Disabled attribute
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  render() {
    const componentClassNames = this.componentClassNames('sl-c-link', {
      'sl-c-link--xs': this.variant === 'xs',
      'sl-c-link--sm': this.variant === 'sm',
      'sl-c-link--lg': this.variant === 'lg',
      'sl-is-disabled': this.isDisabled
    });

    if (this.href) {
      return html`
        <a
          class="${componentClassNames}"
          href=${ifDefined(this.href)}
          target=${ifDefined(this.target)}
          aria-label=${ifDefined(this.label)}
          aria-labelledby=${ifDefined(this.ariaLabelledBy)}
          title=${ifDefined(this.linkTitle)}
          rel=${ifDefined(this.target === '_blank' ? 'noopener' : null)}
        >
          <slot></slot>
        </a>
      `;
    } else {
      return html`
        <button
          class="${componentClassNames}"
          aria-label=${ifDefined(this.label)}
          aria-labelledby=${ifDefined(this.ariaLabelledBy)}
          title=${ifDefined(this.linkTitle)}
          ?disabled=${this.isDisabled}
        >
          <slot></slot>
        </button>
      `;
    }
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLLink.el) === undefined) {
  customElements.define(SLLink.el, SLLink);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-link': SLLink;
  }
}
