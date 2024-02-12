import { TemplateResult, unsafeCSS } from 'lit';
import { property, query, queryAssignedElements } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLChip } from '../chip/chip';
import styles from './chip-group.scss';

/**
 * Component: sl-chip-group
 *
 * Chip Group is used to display chips in a row, with the ability to expand the row and increase the number of visible chips.
 * - **slot**: The chip group content, a set of chips
 */
export class SLChipGroup extends SLElement {
  static el = 'sl-chip-group';

  private elementMap = register({
    elements: [[SLChip.el, SLChip]],
    suffix: (globalThis as any).slAutoRegistry === true ? '' : PackageJson.version
  });

  private chipEl = unsafeStatic(this.elementMap.get(SLChip.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Set the number of visible chips
   */
  @property({ type: Number })
  accessor chipsVisible: number;

  /**
   * Query all the chips
   */
  @queryAssignedElements({ flatten: true })
  accessor chips: Array<SLChip>;

  /**
   * Query the chip group counter
   */
  @query('.sl-c-chip-group__counter')
  accessor chipGroupCounter: SLChip;

  /**
   * First updated lifecycle
   * 1. Hide the chip counter on load
   * 2. Set the visible chips based on the visible property
   */
  firstUpdated() {
    this.chipGroupCounter.classList.add('sl-u-is-vishidden'); /* 1 */
    this.setChipsVisible(); /* 2 */
  }

  /**
   * Set visible chips
   * 1. If a value for visible is greater than 1 but less than the total number of chips, then loop through all the chips.
   * 2. If the chip index is greater or equal to the visible value, then hide those chips.
   * 3. Set the text inside the counter chip to how many chips are hidden.
   */
  setChipsVisible() {
    /* 1 */
    if (this.chipsVisible > 1 && this.chipsVisible < this.chips.length) {
      this.chips.forEach((chip, index) => {
        /* 2 */
        if (index >= this.chipsVisible) {
          chip.isDismissed = true;
        }
      });
      /* 3 */
      const numChipsHidden = this.chips.length - this.chipsVisible;
      this.chipGroupCounter.isDismissed = false;
      this.chipGroupCounter.textContent = '+' + numChipsHidden;
    }
  }

  /**
   * Handle on click events
   * 1. Hide the counter chip when clicked
   * 2. Set all the chips to be active except any that have been dismissed, when the counter chip is clicked
   * 3. Dispatch a custom event
   */
  handleOnClick(e: MouseEvent) {
    /* 1 */
    const target = e.target as SLChip;
    target.isDismissed = true;
    /* 2 */
    this.chips.forEach((chip) => {
      if (!chip.classList.contains('sl-is-dismissed')) {
        chip.isDismissed = false;
      }
    });
    /* 3 */
    this.dispatch({ eventName: 'onChipGroupExpand' });
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-chip-group', {});

    return html`
      <div class="${componentClassNames}">
        <slot></slot>
        <${this.chipEl} class="sl-c-chip-group__counter" variant="secondary" ?isDismissed=${true} @click=${this.handleOnClick}>+</${this.chipEl}>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).slAutoRegistry === true && customElements.get(SLChipGroup.el) === undefined) {
  customElements.define(SLChipGroup.el, SLChipGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-chip-group': SLChipGroup;
  }
}
