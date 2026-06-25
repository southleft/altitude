import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALBadge } from '../badge/badge';
import styles from './avatar.scss';

/**
 * Component: al-avatar
 *
 * @slot - The avatar content. Slot an `<img alt="…">` for a user photo,
 * a single-letter initial string, or an `<al-icon-*>` placeholder. The host
 * **renders as a circle by default** (no `variant` / `shape` attribute is
 * needed for the circular form). The accessible name comes from slotted
 * content — supply meaningful `alt` text on `<img>` or visible initials;
 * a bare `aria-hidden` decorative avatar leaves the avatar unlabeled.
 *
 * @slot badge - Optional small status indicator rendered as a corner overlay
 * (only honored when `hasBadge` is set).
 */
export class ALAvatar extends ALElement {
  static el = 'al-avatar';

  private elementMap = register({
    elements: [[ALBadge.el, ALBadge]],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private badgeEl = unsafeStatic(this.elementMap.get(ALBadge.el));

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
    const componentClassName = this.componentClassNames('al-c-avatar', {
      'al-c-avatar--sm': this.variant === 'sm'
    });

    return html`
      <div class="${componentClassName}">
        <slot></slot>
        ${this.hasBadge
          ? html`
            <${this.badgeEl}
              class="al-c-avatar__badge"
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

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALAvatar.el) === undefined) {
  customElements.define(ALAvatar.el, ALAvatar);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-avatar': ALAvatar;
  }
}
