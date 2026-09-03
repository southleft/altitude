import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALIcon } from '../icon/icon';
import { caretDown, caretUp } from '../icon/glyphs';
import { registerIcons } from '../icon/registry';
import styles from './stat.scss';

registerIcons({ 'caret-up': caretUp, 'caret-down': caretDown });

/**
 * Component: al-stat
 *
 * A single KPI tile — value, label, and an optional trend delta with a
 * directional chevron. Follows the design system's canonical stat-card
 * contract (value/label/trend/delta/invertPolarity). Composes into a "KPI
 * band" by placing several `<al-stat>` inside a grid (see the KPI Band
 * story) or an `<al-layout variant="bento">`.
 *
 * @slot icon - Optional leading icon, rendered above the value.
 * @cssproperty --al-stat-value-color - Text color of the value. Defaults to `--al-theme-color-content-neutral-default`.
 */
export class ALStat extends ALElement {
  static el = 'al-stat';

  private elementMap = register({
    elements: [[ALIcon.el, ALIcon]],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private iconEl = unsafeStatic(this.elementMap.get(ALIcon.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * The display value, e.g. "1,234" or "$4.2M". Typed as a string — the
   * consumer owns locale formatting, digit grouping, and unit suffixes.
   */
  @property()
  accessor value: string;

  /**
   * The metric's label, e.g. "Active users".
   */
  @property()
  accessor label: string;

  /**
   * Optional supporting description rendered below the trend row.
   */
  @property()
  accessor description: string;

  /**
   * Trend direction.
   * - **none** (default) No trend indicator is rendered
   * - **up** Renders an up chevron
   * - **down** Renders a down chevron
   */
  @property()
  accessor trend: 'up' | 'down' | 'none' = 'none';

  /**
   * The delta text, e.g. "+12%". Renders next to the trend chevron. The
   * trend row only renders when this is a non-empty string.
   */
  @property()
  accessor delta: string;

  /**
   * Flips ONLY the success/danger color mapping for metrics where a lower
   * number is better (cost, latency, churn). The chevron direction and the
   * accessible "Trending up/down" text always reflect the literal `trend`
   * value — only the color changes.
   */
  @property({ type: Boolean })
  accessor invertPolarity: boolean;

  private get hasIcon(): boolean {
    return this.slotNotEmpty('icon');
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-stat', {
      'al-c-stat--trend-up': this.trend === 'up',
      'al-c-stat--trend-down': this.trend === 'down',
      'al-c-stat--invert-polarity': this.invertPolarity === true
    });

    const trendLabel = this.trend === 'up' ? 'Trending up,' : this.trend === 'down' ? 'Trending down,' : '';

    return html`
      <div class="${componentClassNames}" part="container">
        <div class="al-c-stat__icon" ?hidden=${!this.hasIcon}>
          <slot name="icon" @slotchange=${() => this.requestUpdate()}></slot>
        </div>
        <span class="al-c-stat__value" part="value">${this.value}</span>
        <span class="al-c-stat__label">${this.label}</span>
        ${this.delta
          ? html`
              <div class="al-c-stat__trend" part="trend">
                ${this.trend !== 'none'
                  ? html`
                      <${this.iconEl}
                        class="al-c-stat__trend-icon"
                        name=${this.trend === 'up' ? 'caret-up' : 'caret-down'}
                        size="sm"
                        aria-hidden="true"
                      ></${this.iconEl}>
                    `
                  : ''}
                ${trendLabel ? html`<span class="al-u-is-vishidden">${trendLabel}</span>` : ''}
                <span>${this.delta}</span>
              </div>
            `
          : ''}
        ${this.description ? html`<p class="al-c-stat__description">${this.description}</p>` : ''}
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALStat.el) === undefined) {
  customElements.define(ALStat.el, ALStat);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-stat': ALStat;
  }
}
