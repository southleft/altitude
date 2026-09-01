import { html, unsafeCSS, nothing } from 'lit';
import { property, query } from 'lit/decorators.js';
import { ALElement } from '../../../al-web-components/components/ALElement';
import '../../../al-web-components/components/layout/layout';
import '../../../al-web-components/components/heading/heading';
import '../../../al-web-components/components/text-block/text-block';
import styles from './hero.scss';

/**
 * Component: al-hero
 *
 * The HOMEPAGE hero — a full-bleed landing composition: the brand's grid
 * texture behind a kicker and a display headline, then a two-column split with
 * the lead copy and actions on the left and a supporting panel on the right.
 *
 * Distinct from `al-page-hero`, the interior band on 19 of the site's other
 * pages. The site's own class names (`.al-hero` vs `.al-page-hero`) already
 * separate them; these components keep that split rather than overloading one
 * name — they are different shapes, not variants of each other.
 *
 * ```html
 * <al-hero
 *   kicker="<southleft>"
 *   heading="AI-powered design systems. Built by the people building the tools."
 *   lead="We audit, build, and evolve design systems for teams at…"
 * >
 *   <al-button slot="actions" href="/contact">Book a call</al-button>
 *   <al-button slot="actions" variant="tertiary" href="/services">See how we work</al-button>
 *   <div slot="chips">…loose token chips…</div>
 *   <div slot="aside">…the terminal panel…</div>
 * </al-hero>
 * ```
 *
 * THE GLYPH FIELD IS PART OF THE HERO, not page art. It was first left in the
 * app on the reuse test, which was the wrong call: the marks are drawn on the
 * SAME 72px lattice as the grid texture, and the app's own note says it plainly
 * — "the grid alone reads as an empty backdrop". Grid without marks is an
 * unfinished hero, so the component owns both layers. `--sl-artifacts` thins
 * the field or silences it (`0`), and reduced motion stops it moving.
 *
 * WHAT STAYS IN THE PAGE is the terminal panel — one page, brand art with no
 * bearing on the hero's shape. The `aside` slot is that seam: the hero owns the
 * two-column composition and the rhythm, the page owns what fills the right
 * column.
 *
 * @slot actions - The CTAs, under the lead copy. Laid out as a wrapping row.
 * @slot chips - The annotation strip beneath the actions — the site's "loose tokens" row.
 * @slot aside - The right-hand column. Hidden below `64rem`, where the composition collapses to one column and a supporting panel would crowd the fold.
 * @slot - Anything extra at the end of the lead column.
 *
 * @csspart band - The full-bleed outer band.
 * @csspart texture - The decorative grid layer. Hide it with `display: none` for a plain hero.
 * @csspart murmur - The glyph field drawn over the grid. Hide it for a plain grid.
 * @csspart kicker - The accent kicker.
 * @csspart heading - The display headline.
 * @csspart lead - The lead paragraph.
 * @csspart aside - The right-hand column wrapper.
 *
 * @cssproperty --al-hero-padding-block - The band's vertical rhythm. Defaults to `5rem`, stepping up at the `48rem` and `64rem` breakpoints.
 * @cssproperty --al-hero-measure - The content column. Defaults to `79rem`.
 * @cssproperty --al-hero-template - The two-column track list above `64rem`. Defaults to `minmax(0, 1fr) minmax(0, 0.85fr)`.
 * @cssproperty --al-hero-heading-max-width - Measure the headline is capped to. Defaults to `18ch`.
 * @cssproperty --sl-artifacts - Density of the glyph field, `0`–`1`. `0` silences it entirely. Defaults to `1`.
 */
export class SLHero extends ALElement {
  static el = 'al-hero';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /** The accent kicker above the headline. */
  @property()
  accessor kicker: string;

  /** The headline. Rendered at the display scale. */
  @property()
  accessor heading: string;

  /** The lead paragraph in the left column. */
  @property()
  accessor lead: string;

  @query('canvas')
  private accessor canvas: HTMLCanvasElement;

  /** 72px — the SAME cell as the grid texture. If one changes the other must, or the marks stop landing on the grid. */
  private static readonly CELL = 72;

  private murmurTimer: number | undefined;
  private murmurCols = 0;
  private murmurRows = 0;

  firstUpdated() {
    this.seedMurmur();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // One cell changes every 900ms. Barely animated on purpose — the field is
      // the hero's texture, not an effect.
      this.murmurTimer = window.setInterval(() => this.stirMurmur(), 900);
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.seedMurmur());
      this.resizeObserver.observe(this);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.murmurTimer) clearInterval(this.murmurTimer);
    this.resizeObserver?.disconnect();
  }

  private resizeObserver: ResizeObserver | undefined;

  /** Colours are read from custom properties, never hardcoded, so a mode switch or a derived theme repaints correctly. */
  private cssVar(name: string): string {
    return getComputedStyle(this).getPropertyValue(name).trim();
  }

  /** Field density, 0–1. `--sl-artifacts` lets a theme thin it out or silence it. */
  private get density(): number {
    const v = parseFloat(this.cssVar('--sl-artifacts'));
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
  }

  /** One mark, centred in its cell. Five forms. */
  private glyph(ctx: CanvasRenderingContext2D, c: number, r: number, accent: boolean) {
    const CELL = SLHero.CELL;
    const x = c * CELL;
    const y = r * CELL;
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;

    ctx.clearRect(x, y, CELL, CELL);
    ctx.strokeStyle = accent
      ? this.cssVar('--al-color-danger-500') || this.cssVar('--al-theme-color-background-primary-default')
      : this.cssVar('--al-theme-color-border-default-weak');
    ctx.fillStyle = ctx.strokeStyle;
    ctx.globalAlpha = accent ? 0.5 : 0.55;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'square';
    ctx.beginPath();

    switch (Math.floor(Math.random() * 5)) {
      case 0: {
        const d = Math.random() < 0.5 ? 1 : -1; // chevron, either way
        ctx.moveTo(cx + d * 8, cy - 11);
        ctx.lineTo(cx - d * 8, cy);
        ctx.lineTo(cx + d * 8, cy + 11);
        ctx.stroke();
        break;
      }
      case 1: // plus
        ctx.moveTo(cx, cy - 9);
        ctx.lineTo(cx, cy + 9);
        ctx.moveTo(cx - 9, cy);
        ctx.lineTo(cx + 9, cy);
        ctx.stroke();
        break;
      case 2: // ring
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 3: // dot
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      default: // tick
        ctx.moveTo(cx - 7, cy);
        ctx.lineTo(cx + 7, cy);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private seedMurmur() {
    const canvas = this.canvas;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const CELL = SLHero.CELL;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    this.murmurCols = Math.ceil(w / CELL);
    this.murmurRows = Math.ceil(h / CELL);
    const d = this.density;
    for (let r = 0; r < this.murmurRows; r++) {
      for (let c = 0; c < this.murmurCols; c++) {
        // 8.5% of cells carry a mark; 12% of those are the accent red.
        if (Math.random() < 0.085 * d) this.glyph(ctx, c, r, Math.random() < 0.12);
      }
    }
  }

  private stirMurmur() {
    const canvas = this.canvas;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    // Don't paint into a hidden tab or a hero that has scrolled away — this
    // runs for the life of the page, so idling cheaply matters.
    if (document.hidden || !canvas.isConnected) return;
    if (canvas.getBoundingClientRect().bottom < 0) return;
    const CELL = SLHero.CELL;
    const d = this.density;
    const c = Math.floor(Math.random() * this.murmurCols);
    const r = Math.floor(Math.random() * this.murmurRows);
    if (d === 0 || Math.random() < 0.5) ctx.clearRect(c * CELL, r * CELL, CELL, CELL);
    else this.glyph(ctx, c, r, Math.random() < 0.12);
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-hero', {});

    return html`
      <div class="${componentClassNames}" part="band">
        <div class="sl-c-hero__texture" part="texture" aria-hidden="true"></div>
        <canvas class="sl-c-hero__murmur" part="murmur" aria-hidden="true"></canvas>

        <div class="sl-c-hero__content">
        <al-layout variant="constrained" class="sl-c-hero__inner">
          <al-layout gap="none">
            ${this.kicker ? html`<p class="sl-c-hero__kicker" part="kicker">${this.kicker}</p>` : nothing}
            ${this.heading
              ? html`<al-heading class="sl-c-hero__heading" part="heading" tagName="h1" variant="display-lg" isBold>
                  ${this.heading}
                </al-heading>`
              : nothing}

            <al-layout variant="grid" noCollapse align="end" class="sl-c-hero__grid">
              <al-layout gap="none" class="sl-c-hero__lead-col">
                ${this.lead
                  ? html`<al-text-block class="sl-c-hero__lead" part="lead">${this.lead}</al-text-block>`
                  : nothing}
                <al-layout direction="row" wrap gap="sm" align="center" class="sl-c-hero__actions">
                  <slot name="actions"></slot>
                </al-layout>
                <div class="sl-c-hero__chips">
                  <slot name="chips"></slot>
                </div>
                <slot></slot>
              </al-layout>

              <div class="sl-c-hero__aside" part="aside">
                <slot name="aside"></slot>
              </div>
            </al-layout>
          </al-layout>
        </al-layout>
        </div>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(SLHero.el) === undefined) {
  customElements.define(SLHero.el, SLHero);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-hero': SLHero;
  }
}
