import { html, svg, nothing, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './icon.scss';
import type { AltitudeIconDef } from './types';

/**
 * Shared implementation for every icon element.
 *
 * Previously each of the 37 generated icon components carried its own verbatim
 * copy of this render body (~70 lines each). With 1,512 Phosphor glyphs that
 * pattern would have meant ~105,000 lines of generated code, so the body lives
 * here once and the generated modules are 14-line subclasses that set
 * `static glyph`.
 *
 * Subclasses render **synchronously** from a static import — no registry
 * lookup, no await, no placeholder frame — which is what keeps the deprecated
 * `<al-icon-*>` elements SSR-correct and free of layout shift.
 */
export class ALIconBase extends ALElement {
  /** Set by generated subclasses to a statically-imported glyph. */
  static glyph: AltitudeIconDef | undefined = undefined;

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Accessible name. When set, the icon is exposed as `role="img"` with this
   * label; when omitted the icon is hidden from assistive technology, which is
   * correct for decorative icons sitting next to visible text.
   */
  @property()
  accessor iconTitle: string;

  /**
   * Icon size
   * - Default size is 16px
   * - **xs** renders a 8px icon
   * - **sm** renders a 12px icon
   * - **md** renders a 20px icon
   * - **lg** renders a 24px icon
   * - **xl** renders a 32px icon
   * - **xxl** renders a 36px icon
   * - **xxxl** renders a 40px icon
   */
  @property()
  accessor size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';

  /** Overridden by `<al-icon>` to resolve through the registry instead. */
  protected get resolvedIcon(): AltitudeIconDef | undefined {
    return (this.constructor as typeof ALIconBase).glyph;
  }

  /** Overridden by `<al-icon>` to fall back to `<slot>` when no name is set. */
  protected renderContent(): unknown {
    const def = this.resolvedIcon;
    // An empty <svg> still matches the `svg { height/width: ... }` rules in
    // icon.scss, so the box is identical whether or not the glyph has loaded.
    // Layout shift is impossible by construction — no skeleton needed.
    return svg`<svg
      part="svg"
      viewBox="${def ? def.v : '0 0 256 256'}"
      focusable="false"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >${def ? def.c : nothing}</svg>`;
  }

  render() {
    const componentClassName = this.componentClassNames('al-c-icon', {
      'al-c-icon--xs': this.size === 'xs',
      'al-c-icon--sm': this.size === 'sm',
      'al-c-icon--md': this.size === 'md',
      'al-c-icon--lg': this.size === 'lg',
      'al-c-icon--xl': this.size === 'xl',
      'al-c-icon--xxl': this.size === 'xxl',
      'al-c-icon--xxxl': this.size === 'xxxl'
    });

    // NOTE: this previously used `aria-labelledby="${this.iconTitle}"`, but
    // `aria-labelledby` takes IDREFs — passing label *text* produced a dangling
    // reference and the icon was announced as unlabelled. `aria-label` is the
    // correct attribute for a literal string.
    return html`
      <span
        class="${componentClassName}"
        role="${this.iconTitle ? 'img' : 'presentation'}"
        aria-label="${this.iconTitle || nothing}"
        aria-hidden="${this.iconTitle ? nothing : 'true'}"
      >
        ${this.renderContent()}
      </span>
    `;
  }
}
