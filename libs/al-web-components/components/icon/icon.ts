import { html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ALIconBase } from './icon-base';
import { getIcon, resolveIcon, hasIconResolver, subscribeToIconRegistry } from './registry';
import { LEGACY_ALIASES } from './icon-aliases';
import type { AltitudeIconDef, ALIconWeight } from './types';

const isDev = typeof process === 'undefined' || process.env?.NODE_ENV !== 'production';
const warned = new Set<string>();

/**
 * Three Phosphor names (`export`, `function`, `package`) are JS reserved words,
 * so `glyphs.ts` exports them with an `Icon` suffix. Mirror that here or the
 * suggested import in the diagnostic below would not compile.
 */
const RESERVED_EXPORTS = new Set(['export', 'function', 'package']);
function toExportName(kebab: string): string {
  const camel = kebab.replace(/-([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
  return RESERVED_EXPORTS.has(camel) ? `${camel}Icon` : camel;
}

function warnOnce(key: string, message: string, level: 'warn' | 'error' = 'error'): void {
  if (!isDev || warned.has(key)) return;
  warned.add(key);
  console[level](message);
}

/**
 * Component: al-icon
 *
 * - **slot**: an inline `<svg>`. Rendered only when `name` is not set, which
 *   preserves the original slot-based behaviour byte for byte.
 */
export class ALIcon extends ALIconBase {
  static el = 'al-icon';

  /**
   * Phosphor glyph name, kebab-case — e.g. `caret-down`, `magnifying-glass`, `x`.
   *
   * Typed as `string` rather than a 1,512-member union on purpose: the schema
   * generator expands string-literal unions into JSON Schema `enum`s, which
   * would produce a ~40 KB schema for this one attribute. Names are validated
   * at runtime instead.
   */
  @property()
  accessor name: string | undefined;

  /**
   * Icon weight. Only `regular` is bundled today; other values fall back to it
   * with a dev warning. Declared now so adding weights later is not a breaking
   * change to the manifest/schema contract.
   */
  @property()
  accessor weight: ALIconWeight = 'regular';

  @state()
  private accessor _def: AltitudeIconDef | undefined;

  private _token = 0;
  private _unsubscribe?: () => void;

  connectedCallback(): void {
    super.connectedCallback();
    // Repaint if the glyph is registered after this element first rendered.
    this._unsubscribe = subscribeToIconRegistry(() => this._sync());
    if (this.name) this._sync();
  }

  disconnectedCallback(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
    super.disconnectedCallback();
  }

  willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('name') || changed.has('weight')) this._sync();
  }

  private get _weight(): ALIconWeight {
    if (this.weight && this.weight !== 'regular') {
      warnOnce(
        `weight:${this.weight}`,
        `[altitude] <al-icon weight="${this.weight}"> — only the 'regular' weight is bundled; falling back to it.`,
        'warn'
      );
    }
    return 'regular';
  }

  /**
   * Resolution order. The alias map is one-directional and non-transitive: a
   * legacy name is consulted only *after* the Phosphor catalog misses, so a
   * legacy name can never shadow a real Phosphor icon.
   *
   *   1. `name` as a Phosphor glyph        — `name="list"` is always the hamburger
   *   2. `name` as a legacy Altitude alias — keeps `name="close"`, `name="add"` working
   */
  private _lookup(name: string, weight: ALIconWeight): AltitudeIconDef | undefined {
    const direct = getIcon(name, weight);
    if (direct) return direct;
    const aliased = LEGACY_ALIASES[name];
    return aliased ? getIcon(aliased, weight) : undefined;
  }

  private _sync(): void {
    const name = this.name;
    if (!name) {
      this._def = undefined;
      return;
    }

    const weight = this._weight;

    // Fast path. Assigning here (from willUpdate/connectedCallback) means the
    // first render already has the glyph — there is never a placeholder frame
    // for an explicitly registered icon.
    const hit = this._lookup(name, weight);
    if (hit) {
      this._def = hit;
      return;
    }

    this._def = undefined;

    // Suggest the glyph that will actually be loaded. For a legacy alias that
    // is the Phosphor target (`close` -> `x`), not the name the author typed.
    const target = LEGACY_ALIASES[name] ?? name;

    if (!hasIconResolver()) {
      const aliasNote =
        target === name ? '' : `  "${name}" is a deprecated alias for the Phosphor icon "${target}".\n`;
      warnOnce(
        `missing:${name}`,
        `[altitude] <al-icon name="${name}"> is not registered and no resolver is installed.\n` +
          aliasNote +
          `  Register it explicitly (recommended — tree-shakeable, SSR-safe):\n` +
          `    import { ${toExportName(target)} } from 'al-web-components/dist/components/icon/glyphs.js';\n` +
          `    import { registerIcons } from 'al-web-components/dist/components/icon/registry.js';\n` +
          `    registerIcons({ '${target}': ${toExportName(target)} });\n` +
          `  Or enable dynamic loading of all glyphs (+~13 KB gzipped, not SSR-renderable):\n` +
          `    import 'al-web-components/dist/components/icon/lazy.js';`
      );
      return;
    }

    const token = ++this._token;
    void resolveIcon(target, weight).then((def) => {
      // Guard against out-of-order resolution when `name` changes mid-flight.
      if (token !== this._token) return;
      if (!def) {
        warnOnce(`unknown:${name}`, `[altitude] <al-icon name="${name}"> — no such icon.`);
      }
      this._def = def;
    });
  }

  protected get resolvedIcon(): AltitudeIconDef | undefined {
    return this._def;
  }

  protected renderContent(): unknown {
    // No `name` → original slot behaviour, unchanged.
    if (!this.name) return html`<slot></slot>`;
    return super.renderContent();
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALIcon.el) === undefined) {
  customElements.define(ALIcon.el, ALIcon);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-icon': ALIcon;
  }
}
