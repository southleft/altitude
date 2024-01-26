import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLBadge } from '../badge/badge';
import styles from './avatar.scss';

/**
 * Component: sl-avatar
 * - Avatars are used to represent a user and can hold strings, icons, and images. Avatars can also be used with dot badges.
 * @slot - The avatar content
 */
export class SLAvatar extends SLElement {
  static el = 'sl-avatar';

  private elementMap = register({
    elements: [[SLBadge.el, SLBadge]],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private badgeEl = unsafeStatic(this.elementMap.get(SLBadge.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Avatar varaint
   * - **default** Renders an avatar with an height & width of 40px
   * - **sm** Renders an avatar with an height & width of 28px
   */
  @property()
  accessor variant: 'sm';

  /**
   * Has Badge?
   * - If true, shows the badge on the outside of the avatar circle
   * - If false, hides the badge
   */
  @property({ type: Boolean })
  accessor hasBadge: boolean;

  /**
   * Badge state variant
   * - **default** Displays a badge with the default state
   * - **success** renders a badge with success state treatment
   * - **warning** renders a badge with warning state treatment
   * - **danger** renders a badge with danger state treatment
   */
  @property()
  accessor badgeVariant: 'success' | 'warning' | 'danger';

  render() {
    const componentClassName = this.componentClassNames('sl-c-avatar', {
      'sl-c-avatar--sm': this.variant === 'sm'
    });

    return html`
      <div class="${componentClassName}">
        <slot></slot>
        ${this.hasBadge
          ? html`
            <${this.badgeEl}
              class="sl-c-avatar__badge"
              ?isDot=${true}
              variant=${ifDefined(this.badgeVariant)}
              position="bottom-right"
            >
            </${this.badgeEl}>`
          : null}
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLAvatar.el) === undefined) {
  customElements.define(SLAvatar.el, SLAvatar);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-avatar': SLAvatar;
  }
}
