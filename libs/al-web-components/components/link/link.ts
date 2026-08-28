import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ALElement } from '../ALElement';
import styles from './link.scss';

/**
 * Component: al-link
 * @slot - The link text
 * @slot after - Content to display after the link text, typically an icon
 *   (an external-link or chevron affordance). The link is `inline-flex` with a
 *   `--al-theme-space-xs` gap, and each size variant re-binds `--al-icon-width` /
 *   `--al-icon-height`, so a slotted icon is sized by the variant automatically.
 *
 *     <al-link href="/docs">Read the docs<al-icon-chevron-right slot="after"></al-icon-chevron-right></al-link>
 */
export class ALLink extends ALElement {
  static el = 'al-link';

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
   * - **default** renders a link with the al-theme-typography-body-md preset
   * - **xs** renders a link with the al-theme-typography-body-xs preset
   * - **sm** renders a link with the al-theme-typography-body-sm preset
   * - **lg** renders a link with the al-theme-typography-body-lg preset
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
    const componentClassNames = this.componentClassNames('al-c-link', {
      'al-c-link--xs': this.variant === 'xs',
      'al-c-link--sm': this.variant === 'sm',
      'al-c-link--lg': this.variant === 'lg',
      'al-is-disabled': this.isDisabled
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
          ${this.slotNotEmpty('after') && html`<span class="al-c-link__after"><slot name="after"></slot></span>`}
        </a>
      `;
    } else {
      return html`
        <button
          class="${componentClassNames}"
          aria-label=${ifDefined(this.label)}
          aria-labelledby=${ifDefined(this.ariaLabelledBy)}
          title=${ifDefined(this.linkTitle)}
          aria-disabled=${ifDefined(this.isDisabled)}
        >
          <slot></slot>
          ${this.slotNotEmpty('after') && html`<span class="al-c-link__after"><slot name="after"></slot></span>`}
        </button>
      `;
    }
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALLink.el) === undefined) {
  customElements.define(ALLink.el, ALLink);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-link': ALLink;
  }
}
