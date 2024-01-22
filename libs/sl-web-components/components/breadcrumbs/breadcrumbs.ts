import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLBreadcrumbsItem } from '../breadcrumbs-item/breadcrumbs-item';
import { SLButton } from '../button/button';
import { SLIconDotsHorizontal } from '../icon/icons/dots-horizontal';
import { SLMenuItem } from '../menu-item/menu-item';
import { SLMenu } from '../menu/menu';
import styles from './breadcrumbs.scss';

/**
 * Component: sl-breadcrumbs
 * - Breadcrumbs consist of a list of links that help a user visualize a page's location within the hierarchical structure of a website, and allow navigation up to any of its "ancestors".
 * @slot - The component content
 */
export class SLBreadcrumbs extends SLElement {
  static el = 'sl-breadcrumbs';

  private elementMap = register({
    elements: [
      [SLBreadcrumbsItem.el, SLBreadcrumbsItem],
      [SLMenu.el, SLMenu],
      [SLMenuItem.el, SLMenuItem],
      [SLButton.el, SLButton],
      [SLIconDotsHorizontal.el, SLIconDotsHorizontal]
    ],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private breadcrumbsItemEl = unsafeStatic(this.elementMap.get(SLBreadcrumbsItem.el));
  private menuEl = unsafeStatic(this.elementMap.get(SLMenu.el));
  private menuItemEl = unsafeStatic(this.elementMap.get(SLMenuItem.el));
  private buttonEl = unsafeStatic(this.elementMap.get(SLButton.el));
  private iconDotsHorizontalEl = unsafeStatic(this.elementMap.get(SLIconDotsHorizontal.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Label attribute
   * - Provides an accessible name for the breadcrumbs element
   */
  @property({ type: String })
  accessor label: string = 'Breadcrumb';

  /**
   * Truncated attribute
   * - **true** Collapse items under a SLPanel based on the itemsBefore/AfterCollpase properties
   * - **false** Do not collapse any breacrumb items
   */
  @property({ type: Boolean })
  accessor isTruncated: boolean;

  /**
   * Number of items to display after the Panel in the Truncated treatment
   * - Default is 1
   */
  @property({ type: Number })
  accessor itemsAfterCollapse: number = 1;

  /**
   * Number of items to display before the Panel in the Truncated treatment
   * - Default is 1
   */
  @property({ type: Number })
  accessor itemsBeforeCollapse: number = 1;

  /**
   * Query all the SLBreadcrumbsItem's
   * - Use get as truncated items do not pull from the slot
   */
  get breadcrumbsItems(): Array<SLBreadcrumbsItem> {
    return [...this.querySelectorAll<SLBreadcrumbsItem>(this.elementMap.get(SLBreadcrumbsItem.el))];
  }

  /**
   * First updated lifecycle
   * 1. If the component has slotted breadcrumb items, apply separators to the items
   */
  firstUpdated() {
    this.setHasSeparators();
  }

  /**
   * Set separators to slotted breadcrumb items
   * 1. Loop through the items in the breadcrumbsItems array
   * 2. If the item is the last in the array, mark it as the current item and do not apply a separator
   * 3. Otherwise, apply a separator to the item indicating it's not the last item in the sequence
   */
  setHasSeparators() {
    /* 1 */
    this.breadcrumbsItems.forEach((item: any, index: number) => {
      const isLast = index === this.breadcrumbsItems.length - 1;
      item.isCurrent = isLast; /* 2 */
      item.hasSeparator = !isLast; /* 3 */
    });
  }

  /**
   * Render truncated breadcrumbs if isTruncated is true
   * 1. Create a copy of the breadcrumbsItems array
   * 2. Generate breadcrumb items dynamically with necessary properties and inner HTML
   * 3. Identify the items to be collapsed based on the itemsBefore/AfterCollapsed properties
   * 4. Replace the collapsed items with a Panel and add the items as list-items to the menu
   * 5. Return the HTML string for the generated components
   */
  renderTruncatedItems() {
    const items = [...this.breadcrumbsItems]; /* 1 */
    /* 2 */
    const breadcrumbsItem = items.map((item: SLBreadcrumbsItem, index: number) => {
      const isLast = index === items.length - 1;
      return html`
        <${this.breadcrumbsItemEl}
          ?hasSeparator=${!isLast}
          ?isCurrent=${isLast}
          href=${ifDefined(item.href)}
          target=${ifDefined(item.target)}
        >
          ${unsafeHTML(item.innerHTML)}
        </${this.breadcrumbsItemEl}>
      `;
    });
    /* 3 */
    const startIndex = this.itemsBeforeCollapse;
    let endIndex = items.length - this.itemsAfterCollapse;
    if (startIndex > 1) {
      endIndex = endIndex - 2;
    } else {
      endIndex = endIndex - 1;
    }
    const collapsedItems = items.splice(startIndex, endIndex);
    /* 4 */
    breadcrumbsItem.splice(
      startIndex,
      endIndex,
      html`
        <${this.breadcrumbsItemEl} ?hasSeparator=${true} ?isTruncated=${true}>
          <${this.menuEl}>
            <${this.buttonEl} slot="trigger" variant="tertiary" ?hideText=${true}>
              <${this.iconDotsHorizontalEl} slot="before"></${this.iconDotsHorizontalEl}>More Items
            </${this.buttonEl}>
            ${collapsedItems.map((item: any) => {
              return html`
                <${this.menuItemEl} href=${ifDefined(item.href)} target=${ifDefined(item.target)}>
                  ${unsafeHTML(item.innerHTML)}
                </${this.menuItemEl}>
              `;
            })}
          </${this.menuEl}>
        </${this.breadcrumbsItemEl}>
      `
    );
    /* 5 */
    return breadcrumbsItem;
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-breadcrumbs', {});

    return html`
      <nav role="navigation" class="${componentClassNames}" aria-label=${this.label}>
        <ol role="list" class="sl-c-breadcrumbs__list">
          ${this.isTruncated ? html` ${this.renderTruncatedItems()} ` : html` <slot></slot> `}
        </ol>
      </nav>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLBreadcrumbs.el) === undefined) {
  customElements.define(SLBreadcrumbs.el, SLBreadcrumbs);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-breadcrumbs': SLBreadcrumbs;
  }
}
