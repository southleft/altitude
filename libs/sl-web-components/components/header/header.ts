import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../../../al-web-components/components/ALElement';
import '../../../al-web-components/components/header/header';
import '../../../al-web-components/components/layout/layout';
import styles from './header.scss';

/**
 * Component: sl-header
 *
 * Southleft's primary navigation bar — sticky, translucent, blurred, with pill
 * nav items, circular icon actions and a numbered mobile panel.
 *
 * Built ON `<al-header>`, not instead of it. Altitude owns the `<header>`
 * landmark, the sticky behaviour and the stacking context; this component feeds
 * it the brand's chrome through the custom properties `al-header` exposes for
 * exactly that purpose (`--al-header-background`, `--al-header-backdrop-filter`,
 * `--al-header-border-block-end`) and adds the parts that are Southleft's
 * alone: the pill treatment, the icon-button shape, and the mobile panel.
 *
 * ```html
 * <sl-header>
 *   <al-logo slot="brand" variant="southleft" href="/"></al-logo>
 *   <a slot="nav" href="/work">Work</a>
 *   <a slot="nav" href="/insights" aria-current="page">Insights</a>
 *   <button slot="actions" aria-label="Ink / paper">…</button>
 *   <al-button slot="actions" href="/contact">Book a call</al-button>
 *   <a slot="mobile" href="/work">Work</a>
 * </sl-header>
 * ```
 *
 * It earns its own tag by owning BEHAVIOUR, not arrangement: the mobile panel's
 * open/closed state, the button that drives it, and the `aria-expanded` /
 * `aria-controls` relationship between them. Everything positional is still
 * `<al-layout>`.
 *
 * @slot brand - The wordmark. Usually `<al-logo variant="southleft">`.
 * @slot nav - The primary links, as flat `<a>` elements. The component gives them the pill treatment and marks `aria-current="page"` as the filled state. Hidden below the `64rem` breakpoint, where the mobile panel takes over.
 * @slot actions - The right-hand cluster. Native `<button>`s get the circular icon treatment; anything else (an `<al-button>` CTA) is left alone.
 * @slot mobile - The panel's links. Supplied separately from `nav` because a slot can project its nodes only once — see the note in the SCSS.
 *
 * @csspart bar - The row inside the measure.
 * @csspart nav - The `<nav>` landmark around the pills.
 * @csspart menu-button - The button that opens the mobile panel.
 * @csspart panel - The mobile panel.
 *
 * @cssproperty --sl-header-height - Bar height. Defaults to `4rem`, and `5rem` from the `48rem` breakpoint up.
 * @cssproperty --sl-header-measure - The content column. Defaults to `79rem`.
 * @cssproperty --sl-header-background - Bar surface. Defaults to the page background at 85% so the blur reads.
 *
 * @fires sl-header-menu-toggle - When the mobile panel opens or closes. `detail.open` carries the new state.
 */
export class SLHeader extends ALElement {
  static el = 'sl-header';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /** Stick the bar to the top of the scroll container. On by default — the site's header is sticky. */
  @property({ type: Boolean, reflect: true })
  accessor sticky: boolean = true;

  /**
   * Whether the mobile panel is open. Reflected so the page can style against
   * `sl-header[menu-open]` and so the state is inspectable in devtools rather
   * than trapped in the shadow root.
   */
  @property({ type: Boolean, reflect: true, attribute: 'menu-open' })
  accessor menuOpen: boolean;

  private toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.dispatch({ eventName: 'sl-header-menu-toggle', detailObj: { open: this.menuOpen } });
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-header', {});

    return html`
      <al-header ?sticky=${this.sticky} class="${componentClassNames}">
        <al-layout variant="constrained" class="sl-c-header__measure">
          <al-layout direction="row" align="center" justify="between" gap="lg" part="bar">
            <slot name="brand"></slot>

            <al-layout direction="row" align="center" gap="md">
              <nav class="sl-c-header__nav" part="nav" aria-label="Primary">
                <al-layout direction="row" align="center" gap="xs">
                  <slot name="nav"></slot>
                </al-layout>
              </nav>

              <al-layout direction="row" align="center" gap="sm">
                <slot name="actions"></slot>
                <button
                  type="button"
                  class="sl-c-header__menu-button"
                  part="menu-button"
                  aria-label="Menu"
                  aria-expanded=${this.menuOpen ? 'true' : 'false'}
                  aria-controls="sl-header-panel"
                  @click=${this.toggleMenu}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                    ${this.menuOpen
                      ? html`<path d="M6 6l12 12M18 6L6 18"></path>`
                      : html`<path d="M3 6h18M3 12h18M3 18h18"></path>`}
                  </svg>
                </button>
              </al-layout>
            </al-layout>
          </al-layout>
        </al-layout>

        <nav
          id="sl-header-panel"
          class="sl-c-header__panel"
          part="panel"
          aria-label="Primary mobile"
          ?hidden=${!this.menuOpen}
        >
          <al-layout variant="constrained" class="sl-c-header__measure">
            <al-layout gap="xs">
              <slot name="mobile"></slot>
            </al-layout>
          </al-layout>
        </nav>
      </al-header>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(SLHeader.el) === undefined) {
  customElements.define(SLHeader.el, SLHeader);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-header': SLHeader;
  }
}
