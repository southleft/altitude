import { LitElement, html, unsafeCSS, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import styles from './showcase-home.scss';

/* Altitude components composing the page. Every persona renders from this
 * same set — the theme switch is what makes them read as different sites. */
import '../../../components/hero/hero';
import '../../../components/header/header';
import '../../../components/theme-switcher/theme-switcher';
import '../../../components/button/button';
import '../../../components/link/link';
import '../../../components/chip/chip';
import '../../../components/heading/heading';
import '../../../components/text-passage/text-passage';
import '../../../components/card/card';
import '../../../components/divider/divider';
import '../../../components/avatar/avatar';
import '../../../components/accordion/accordion';
import '../../../components/accordion-panel/accordion-panel';
import '../../../components/progress/progress';
import '../../../components/icon/icon';
/* Per-icon imports register their glyphs with the icon registry so
 * `<al-icon name="…">` resolves synchronously. */
import '../../../components/icon/icons/check';
import '../../../components/icon/icons/clock';
import '../../../components/icon/icons/user';
import '../../../components/icon/icons/star';
import '../../../components/icon/icons/info';
import '../../../components/icon/icons/support';
import '../../../components/icon/icons/pin';
import '../../../components/icon/icons/document';
import '../../../components/icon/icons/bell';
import '../../../components/icon/icons/success';
import '../../../components/icon/icons/copy';
import '../../../components/icon/icons/warning-triangle';
import '../../../components/icon/icons/layout-masonry';
import '../../../components/icon/icons/settings';

import { getPersona, Persona, PersonaSection, PersonaMedia } from './personas';

const icon = (name: string, size: 'md' | 'lg' = 'lg') => html`<al-icon name=${name} size=${size}></al-icon>`;

/**
 * Page: al-showcase-home
 *
 * A full home page that re-personifies per brand. It reads the `brand`
 * attribute of its nearest `<al-theme>` ancestor (set by either the
 * Storybook preset toolbar or the in-page `<al-theme-switcher>`) and
 * renders that brand's persona: different hero layout, section order,
 * media treatment, and copy — while every pixel of skin still comes from
 * the token pipeline.
 */
export class ALShowcaseHome extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @state()
  accessor activeBrand: string = 'altitude';

  private themeHost: Element | null = null;
  private themeObserver: MutationObserver | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.themeHost = this.closest('al-theme');
    if (this.themeHost) {
      this.syncBrand();
      this.themeObserver = new MutationObserver(() => this.syncBrand());
      this.themeObserver.observe(this.themeHost, { attributes: true, attributeFilter: ['brand', 'mode'] });
    }
  }

  disconnectedCallback() {
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    super.disconnectedCallback();
  }

  private syncBrand() {
    this.activeBrand = this.themeHost?.getAttribute('brand') ?? 'altitude';
  }

  /* ------------------------------------------------------------------ *
   * Media renderers — the hero's visual area, per persona.
   * ------------------------------------------------------------------ */

  private renderMedia(persona: Persona, media: PersonaMedia) {
    switch (media) {
      case 'app-card':
        return html`
          <div class="al-l-showcase__media-stage">
            <al-card class="al-l-showcase__app-card">
              <div slot="header" class="al-l-showcase__app-head">
                <al-heading tagName="h3" variant="sm" ?isBold=${true}>Today</al-heading>
                <al-chip variant="success">On track</al-chip>
              </div>
              <div class="al-l-showcase__app-row">
                <al-icon name="success"></al-icon>
                <span>Ship the sprint review</span>
                <al-chip variant="secondary">Done</al-chip>
              </div>
              <div class="al-l-showcase__app-row">
                <al-icon name="clock"></al-icon>
                <span>Design tokens workshop</span>
                <al-chip variant="info">2:00 PM</al-chip>
              </div>
              <div class="al-l-showcase__app-row">
                <al-icon name="user"></al-icon>
                <span>1-on-1 with Priya</span>
                <al-chip>Personal</al-chip>
              </div>
              <al-progress duration="1" endProgress="75" ?showLabel=${true}></al-progress>
            </al-card>
          </div>
        `;
      case 'ops-card':
        return html`
          <div class="al-l-showcase__media-stage">
            <al-card class="al-l-showcase__app-card">
              <div slot="header" class="al-l-showcase__app-head">
                <al-heading tagName="h3" variant="sm" ?isBold=${true}>#US045861</al-heading>
                <al-chip variant="warning">In Transit</al-chip>
              </div>
              <div class="al-l-showcase__spec-row"><span>Route</span><strong>Dallas, TX → Houston, TX</strong></div>
              <div class="al-l-showcase__spec-row"><span>Customer</span><strong>TNA Groups</strong></div>
              <div class="al-l-showcase__spec-row"><span>Weight</span><strong>650 kg · 340 KM</strong></div>
              <al-divider></al-divider>
              <div class="al-l-showcase__spec-row"><span>ETA</span><strong>12 SEP, 2026</strong></div>
              <al-button slot="actions-end" variant="secondary">Track order</al-button>
            </al-card>
          </div>
        `;
      case 'terminal':
        return html`
          <div class="al-l-showcase__terminal" role="img" aria-label="Terminal session running altitude-validate">
            <div class="al-l-showcase__terminal-bar"><span></span><span></span><span></span></div>
            <pre class="al-l-showcase__terminal-body">
$ npx altitude-validate ./src
  scanning 214 files…
  ✓ 0 violations
  ✓ token contract: no drift
  ✓ brands: every pair distinct
$ echo $?
0 <span class="al-l-showcase__cursor">▮</span></pre>
          </div>
        `;
      case 'grid-art':
        return html`
          <div class="al-l-showcase__art al-l-showcase__art--grid" role="img" aria-label="Blueprint grid graphic">
            <span class="al-l-showcase__art-tag">PERFORMANCE FIRST</span>
            <span class="al-l-showcase__art-tag al-l-showcase__art-tag--far">SCALABLE STACK</span>
            <div class="al-l-showcase__art-block"></div>
          </div>
        `;
      case 'glow-art':
        return html`
          <div class="al-l-showcase__art al-l-showcase__art--glow" role="img" aria-label="Concentric glow graphic">
            <div class="al-l-showcase__orbit"></div>
            <div class="al-l-showcase__orbit al-l-showcase__orbit--far"></div>
          </div>
        `;
      case 'poster-type':
        return html`
          <div class="al-l-showcase__art al-l-showcase__art--poster" role="img" aria-label="Oversized wordmark backdrop">
            <span class="al-l-showcase__poster-word">${persona.site.replace(/[^A-Za-z]/g, '').toUpperCase()}</span>
            <div class="al-l-showcase__beam"></div>
            <div class="al-l-showcase__beam al-l-showcase__beam--alt"></div>
          </div>
        `;
      case 'editorial-art':
        return html`
          <div class="al-l-showcase__art al-l-showcase__art--editorial" role="img" aria-label="Editorial ornament">
            <span class="al-l-showcase__ornament">${persona.glyph}</span>
            <span class="al-l-showcase__folio">№ 47</span>
          </div>
        `;
    }
    return nothing;
  }

  /* ------------------------------------------------------------------ *
   * Section renderers
   * ------------------------------------------------------------------ */

  private renderSection(section: PersonaSection) {
    switch (section.kind) {
      case 'logos':
        return html`
          <section class="al-l-showcase__section al-l-showcase__section--tight">
            ${section.title ? html`<p class="al-l-showcase__kicker al-l-showcase__kicker--center">${section.title}</p>` : nothing}
            <div class="al-l-showcase__logos">
              ${section.names.map((n) => html`<span class="al-l-showcase__logo-word">${n}</span>`)}
            </div>
          </section>
        `;
      case 'features':
        return html`
          <section class="al-l-showcase__section ${section.centered ? 'al-l-showcase__section--centered' : ''}">
            ${section.eyebrow ? html`<al-chip variant="secondary">${section.eyebrow}</al-chip>` : nothing}
            <al-heading tagName="h2" variant="display-sm" ?isBold=${true}>${section.title}</al-heading>
            ${section.sub ? html`<al-text-passage class="al-l-showcase__section-sub"><p>${section.sub}</p></al-text-passage>` : nothing}
            <div class="al-l-showcase__grid">
              ${section.items.map(
                (f) => html`
                  <al-card>
                    <div slot="header" class="al-l-showcase__feature-head">
                      <span class="al-l-showcase__feature-icon">${icon(f.icon)}</span>
                      <al-heading tagName="h3" variant="sm" ?isBold=${true}>${f.title}</al-heading>
                    </div>
                    <al-text-passage><p>${f.text}</p></al-text-passage>
                  </al-card>
                `
              )}
            </div>
          </section>
        `;
      case 'stats':
        return html`
          <section class="al-l-showcase__section al-l-showcase__section--band">
            <div class="al-l-showcase__stats">
              ${section.items.map(
                (s) => html`
                  <div class="al-l-showcase__stat">
                    <span class="al-l-showcase__stat-value">${s.value}</span>
                    <span class="al-l-showcase__stat-label">${s.label}</span>
                  </div>
                `
              )}
            </div>
          </section>
        `;
      case 'cases':
        return html`
          <section class="al-l-showcase__section">
            ${section.eyebrow ? html`<al-chip variant="secondary">${section.eyebrow}</al-chip>` : nothing}
            <al-heading tagName="h2" variant="display-sm" ?isBold=${true}>${section.title}</al-heading>
            <div class="al-l-showcase__cases">
              ${section.items.map(
                (c) => html`
                  <al-divider></al-divider>
                  <article class="al-l-showcase__case">
                    <span class="al-l-showcase__case-index">${c.index}</span>
                    <div class="al-l-showcase__case-main">
                      <al-heading tagName="h3" variant="md" ?isBold=${true}>${c.title}</al-heading>
                      <al-text-passage><p>${c.text}</p></al-text-passage>
                      ${c.tags?.length
                        ? html`<div class="al-l-showcase__case-tags">${c.tags.map((t) => html`<al-chip>${t}</al-chip>`)}</div>`
                        : nothing}
                    </div>
                    <al-button variant="secondary">View</al-button>
                  </article>
                `
              )}
            </div>
          </section>
        `;
      case 'faq':
        return html`
          <section class="al-l-showcase__section">
            ${section.eyebrow ? html`<al-chip variant="secondary">${section.eyebrow}</al-chip>` : nothing}
            <al-heading tagName="h2" variant="display-sm" ?isBold=${true}>${section.title}</al-heading>
            <div class="al-l-showcase__faq">
              <al-accordion>
                ${section.items.map(
                  (f, i) => html`
                    <al-accordion-panel ?isLast=${i === section.items.length - 1}>
                      <span slot="header">${f.q}</span>
                      <al-text-passage><p>${f.a}</p></al-text-passage>
                    </al-accordion-panel>
                  `
                )}
              </al-accordion>
            </div>
          </section>
        `;
      case 'markets':
        return html`
          <section class="al-l-showcase__section">
            ${section.eyebrow ? html`<al-chip variant="secondary">${section.eyebrow}</al-chip>` : nothing}
            <al-heading tagName="h2" variant="display-sm" ?isBold=${true}>${section.title}</al-heading>
            <div class="al-l-showcase__grid al-l-showcase__grid--four">
              ${section.items.map(
                (m) => html`
                  <al-card>
                    <div slot="header" class="al-l-showcase__market-head">
                      <al-heading tagName="h3" variant="sm" ?isBold=${true}>${m.symbol}</al-heading>
                      <al-chip variant=${m.deltaVariant}>${m.delta}</al-chip>
                    </div>
                    <span class="al-l-showcase__market-value">${m.value}</span>
                    <span class="al-l-showcase__market-name">${m.name}</span>
                  </al-card>
                `
              )}
            </div>
          </section>
        `;
      case 'testimonial':
        return html`
          <section class="al-l-showcase__section al-l-showcase__section--centered">
            <al-card class="al-l-showcase__quote-card" variant="bare">
              <p class="al-l-showcase__quote">“${section.quote}”</p>
              <div class="al-l-showcase__attribution">
                <al-avatar>${section.name.split(' ').map((w) => w[0]).join('')}</al-avatar>
                <div>
                  <strong>${section.name}</strong>
                  <span class="al-l-showcase__muted">${section.role}</span>
                </div>
              </div>
            </al-card>
          </section>
        `;
      case 'cta':
        return html`
          <section class="al-l-showcase__section al-l-showcase__section--cta">
            <al-heading tagName="h2" variant="display-md" ?isBold=${true}>${section.title}</al-heading>
            ${section.sub ? html`<al-text-passage class="al-l-showcase__section-sub"><p>${section.sub}</p></al-text-passage>` : nothing}
            <div class="al-l-showcase__cta-actions">
              <al-button>${section.button}</al-button>
              ${section.secondary ? html`<al-button variant="secondary">${section.secondary}</al-button>` : nothing}
            </div>
          </section>
        `;
    }
    return nothing;
  }

  render() {
    const persona = getPersona(this.activeBrand);
    const hero = persona.hero;

    return html`
      <div class="al-l-showcase" data-brand=${persona.brand} ?data-loud=${persona.loud === true}>
        <al-header class="al-l-showcase__header">
          <span slot="before" class="al-l-showcase__wordmark">
            <span class="al-l-showcase__glyph" aria-hidden="true">${persona.glyph}</span>
            ${persona.site}
          </span>
          <nav class="al-l-showcase__nav" aria-label="Site">
            ${persona.nav.map((item) => html`<al-link href="#">${item}</al-link>`)}
          </nav>
          <span slot="after" class="al-l-showcase__header-after">
            <al-theme-switcher></al-theme-switcher>
            <al-button>${persona.navCta}</al-button>
          </span>
        </al-header>

        <main class="al-l-showcase__frame">
          <al-hero
            class="al-l-showcase__hero"
            layout=${hero.layout ?? nothing}
            mediaPosition=${hero.mediaPosition ?? nothing}
          >
            ${hero.eyebrow ? html`<al-chip slot="eyebrow" variant="secondary">${hero.eyebrow}</al-chip>` : nothing}
            <al-heading slot="heading" tagName="h1" variant="display-lg" ?isBold=${true}>${hero.title}</al-heading>
            <al-text-passage><p>${hero.sub}</p></al-text-passage>
            <al-button slot="actions">${hero.primaryCta}</al-button>
            ${hero.secondaryCta ? html`<al-button slot="actions" variant="secondary">${hero.secondaryCta}</al-button>` : nothing}
            <div slot="media" class="al-l-showcase__media">${this.renderMedia(persona, hero.media)}</div>
            ${hero.stats?.length
              ? html`
                  <div slot="meta" class="al-l-showcase__stats al-l-showcase__stats--meta">
                    ${hero.stats.map(
                      (s) => html`
                        <div class="al-l-showcase__stat">
                          <span class="al-l-showcase__stat-value">${s.value}</span>
                          <span class="al-l-showcase__stat-label">${s.label}</span>
                        </div>
                      `
                    )}
                  </div>
                `
              : nothing}
          </al-hero>

          ${persona.sections.map((s) => this.renderSection(s))}
        </main>

        <footer class="al-l-showcase__footer">
          <div class="al-l-showcase__frame al-l-showcase__footer-grid">
            <div class="al-l-showcase__footer-brand">
              <span class="al-l-showcase__wordmark">
                <span class="al-l-showcase__glyph" aria-hidden="true">${persona.glyph}</span>
                ${persona.site}
              </span>
              <al-text-passage><p>${persona.footer.blurb}</p></al-text-passage>
            </div>
            ${persona.footer.columns.map(
              (col) => html`
                <div class="al-l-showcase__footer-col">
                  <span class="al-l-showcase__kicker">${col.title}</span>
                  ${col.links.map((l) => html`<al-link href="#" variant="sm">${l}</al-link>`)}
                </div>
              `
            )}
          </div>
          <div class="al-l-showcase__frame al-l-showcase__fine">
            <al-divider></al-divider>
            <span>${persona.footer.fine}</span>
          </div>
        </footer>
      </div>
    `;
  }
}

if (customElements.get('al-showcase-home') === undefined) {
  customElements.define('al-showcase-home', ALShowcaseHome);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-showcase-home': ALShowcaseHome;
  }
}
