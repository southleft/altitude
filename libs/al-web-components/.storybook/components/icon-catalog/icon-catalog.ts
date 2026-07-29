import { html, LitElement, unsafeCSS, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import styles from './icon-catalog.scss';

// The `<al-icon>` element itself, plus every glyph registered eagerly. `all.ts`
// is ~230 KB gzipped and exists for exactly this page — it is deliberately not a
// build entry point, so it can never reach an application bundle.
import { ALIcon } from '../../../components/icon/icon';
import '../../../components/icon/all';
import { catalog, ICON_CATEGORIES } from '../../../components/icon/catalog';
import { LEGACY_ALIASES, SHADOWED_LEGACY_NAMES } from '../../../components/icon/icon-aliases';

if (customElements.get(ALIcon.el) === undefined) customElements.define(ALIcon.el, ALIcon);

/** Render budget. 1,512 icons means 1,512 shadow roots — filter first, then render. */
const PAGE_SIZE = 120;

@customElement('icon-catalog')
export class IconCatalog extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @state() private accessor query = '';
  @state() private accessor category: string | null = null;
  @state() private accessor limit = PAGE_SIZE;
  @state() private accessor copied: string | null = null;

  private get filtered() {
    const q = this.query.trim().toLowerCase();
    return catalog.filter((icon) => {
      if (this.category && !icon.categories.includes(this.category)) return false;
      if (!q) return true;
      // Search tags as well as the name — this is the payoff of Phosphor's
      // metadata: typing "settings" should surface `gear`.
      return icon.name.includes(q) || icon.tags.some((t) => t.toLowerCase().includes(q));
    });
  }

  private onSearch(e: Event) {
    this.query = (e.target as HTMLInputElement).value;
    this.limit = PAGE_SIZE;
  }

  private setCategory(value: string | null) {
    this.category = value;
    this.limit = PAGE_SIZE;
  }

  private async copy(name: string) {
    const snippet = `<al-icon name="${name}"></al-icon>`;
    try {
      await navigator.clipboard.writeText(snippet);
      this.copied = name;
      setTimeout(() => {
        if (this.copied === name) this.copied = null;
      }, 1200);
    } catch {
      // Clipboard is unavailable in some embedded/iframe contexts — not fatal.
    }
  }

  private renderTile(icon: (typeof catalog)[number]) {
    const isCopied = this.copied === icon.name;
    return html`
      <button
        class="icon-tile ${isCopied ? 'icon-tile--copied' : ''}"
        type="button"
        title="${icon.tags.length ? `tags: ${icon.tags.join(', ')}` : icon.name}"
        @click=${() => this.copy(icon.name)}
      >
        <al-icon name="${icon.name}" size="lg"></al-icon>
        <span class="icon-tile__name">${icon.name}</span>
        <span class="icon-tile__hint">${isCopied ? 'copied!' : 'click to copy'}</span>
      </button>
    `;
  }

  private renderLegacy() {
    const rows = Object.keys(LEGACY_ALIASES).sort();
    return html`
      <section class="legacy">
        <h2>Deprecated elements</h2>
        <p>
          The ${rows.length} original <code>&lt;al-icon-*&gt;</code> elements still work and now render Phosphor
          artwork, but they are deprecated. Prefer <code>&lt;al-icon name="…"&gt;</code>.
        </p>
        <table class="legacy__table">
          <thead>
            <tr><th>Deprecated element</th><th>Replacement</th><th></th></tr>
          </thead>
          <tbody>
            ${rows.map(
              (legacy) => html`
                <tr>
                  <td><code>&lt;al-icon-${legacy}&gt;</code></td>
                  <td><code>&lt;al-icon name="${LEGACY_ALIASES[legacy]}"&gt;</code></td>
                  <td>
                    ${SHADOWED_LEGACY_NAMES.includes(legacy)
                      ? html`<span class="warn"
                          >⚠ <code>name="${legacy}"</code> is a different Phosphor icon</span
                        >`
                      : nothing}
                  </td>
                </tr>
              `
            )}
          </tbody>
        </table>
      </section>
    `;
  }

  render() {
    const results = this.filtered;
    const shown = results.slice(0, this.limit);

    return html`
      <section>
        <header>
          <h1>Icons</h1>
          <p>
            ${catalog.length} icons from
            <a href="https://phosphoricons.com" target="_blank" rel="noreferrer">Phosphor</a> (regular weight).
            Search matches names <em>and</em> tags — try “settings”, “trash”, or “arrow”.
          </p>
        </header>

        <div class="controls">
          <input
            class="controls__search"
            type="search"
            placeholder="Search ${catalog.length} icons…"
            .value=${this.query}
            @input=${this.onSearch}
            aria-label="Search icons"
          />
          <div class="controls__categories" role="group" aria-label="Filter by category">
            <button
              type="button"
              class="chip ${this.category === null ? 'chip--active' : ''}"
              @click=${() => this.setCategory(null)}
            >
              All
            </button>
            ${ICON_CATEGORIES.map(
              (cat) => html`
                <button
                  type="button"
                  class="chip ${this.category === cat ? 'chip--active' : ''}"
                  @click=${() => this.setCategory(cat)}
                >
                  ${cat}
                </button>
              `
            )}
          </div>
        </div>

        <p class="count">
          ${results.length === 0
            ? html`No icons match <strong>${this.query}</strong>.`
            : html`Showing <strong>${shown.length}</strong> of <strong>${results.length}</strong> icons.`}
        </p>

        <div class="icon-grid">${shown.map((icon) => this.renderTile(icon))}</div>

        ${results.length > shown.length
          ? html`
              <button class="more" type="button" @click=${() => (this.limit += PAGE_SIZE)}>
                Show ${Math.min(PAGE_SIZE, results.length - shown.length)} more
              </button>
            `
          : nothing}
        ${this.renderLegacy()}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'icon-catalog': IconCatalog;
  }
}
