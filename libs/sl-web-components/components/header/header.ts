import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../../../al-web-components/components/ALElement';
/*
 * The base `al-header` module is deliberately NOT imported.
 *
 * It used to be, because this component rendered `<al-header>` inside its
 * own template. It no longer does — this component IS `al-header` now (one
 * namespace; the brand implementation overrides the base one), so importing
 * the base module would register the BASE class under that tag first and win,
 * `customElements.define` being first-come and final. The symptom is exact and
 * silent: every named slot below goes unassigned, because the element that
 * actually upgraded has one unnamed slot, and the header renders empty.
 */
import '../../../al-web-components/components/layout/layout';
import styles from './header.scss';

/**
 * Component: al-header
 *
 * Southleft's primary navigation bar — sticky, translucent, blurred, with pill
 * nav items, circular icon actions and a numbered mobile panel.
 *
 * IT *IS* `al-header` — the brand implementation of that tag, not a wrapper
 * around Altitude's. It owns the `<header>` landmark, the sticky behaviour and
 * the stacking context itself, and adds what is Southleft's alone: the pill
 * treatment, the icon-button shape, and the mobile panel.
 *
 * It used to compose `<al-header>` and feed it chrome through
 * `--al-header-background` / `-backdrop-filter` / `-border-block-end`. Taking
 * the tag ended that (one namespace, spec
 * 2026-08-23-one-al-namespace-across-brand-and-base): an `<al-header>` rendered
 * inside `<al-header>` recurses forever. Those custom properties are still the
 * public API — header.scss now READS them rather than passing them on — so a
 * consumer overriding one is unaffected.
 *
 * An app gets this implementation, or Altitude's bare landmark, by importing
 * one module or the other. Never both: `customElements.define` is first-come
 * and final.
 *
 * ```html
 * <al-header>
 *   <al-logo slot="brand" variant="southleft" href="/"></al-logo>
 *   <a slot="nav" href="/work">Work</a>
 *   <a slot="nav" href="/insights" aria-current="page">Insights</a>
 *   <button slot="actions" aria-label="Ink / paper">…</button>
 *   <al-button slot="actions" href="/contact">Book a call</al-button>
 *   <a slot="mobile" href="/work">Work</a>
 * </al-header>
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
 * @cssproperty --al-header-height - Bar height. Defaults to `4rem`, and `5rem` from the `48rem` breakpoint up.
 * @cssproperty --al-header-measure - The content column. Defaults to `79rem`.
 * @cssproperty --al-header-background - Bar surface. Defaults to the page background at 85% so the blur reads.
 *
 * @fires sl-header-menu-toggle - When the mobile panel opens or closes. `detail.open` carries the new state.
 */
export class SLHeader extends ALElement {
  static el = 'al-header';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /** Stick the bar to the top of the scroll container. On by default — the site's header is sticky. */
  @property({ type: Boolean, reflect: true })
  accessor sticky: boolean = true;

  /**
   * Whether the mobile panel is open. Reflected so the page can style against
   * `al-header[menu-open]` and so the state is inspectable in devtools rather
   * than trapped in the shadow root.
   */
  @property({ type: Boolean, reflect: true, attribute: 'menu-open' })
  accessor menuOpen: boolean;

  private toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.dispatch({ eventName: 'sl-header-menu-toggle', detailObj: { open: this.menuOpen } });
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-header', {
      'al-is-sticky': this.sticky,
    });

    return html`
      <header class="${componentClassNames}" part="bar-outer">
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
      </header>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(SLHeader.el) === undefined) {
  customElements.define(SLHeader.el, SLHeader);
}

/*
 * NO `HTMLElementTagNameMap` ENTRY, DELIBERATELY.
 *
 * This component OVERRIDES the base library's `al-header`: same tag, brand
 * implementation, and the app imports one or the other (see the module note at
 * the top of this file). `HTMLElementTagNameMap` cannot express that. It is a
 * global interface keyed by tag name, both packages compile into one TypeScript
 * program (this package reaches Altitude through relative paths, so its sources
 * join the program — see the `exports` note in package.json), and two
 * declarations of one key with different types is TS2717, a hard build error:
 *
 *   Property ''al-header'' must be of type 'ALHeader', but here has type 'SLHeader'.
 *
 * The base declaration therefore stands, and `document.querySelector('al-header')`
 * types as `ALHeader` even where this implementation is the one registered.
 * That is a known, narrow inaccuracy in the TYPES only — the runtime element is
 * whichever module was imported. Anyone who needs this component's own type
 * imports the exported `SLHeader` class directly, which is the reason it is
 * exported.
 */
