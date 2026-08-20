import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { caretDown, caretUp, caretUpDown } from '../icon/glyphs';
import { registerIcons } from '../icon/registry';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALCheckbox } from '../checkbox/checkbox';
import { ALIcon } from '../icon/icon';
import { ALTableColumn, ALTableRow, ALTableSortDirection } from './table.model';
import styles from './table.scss';

registerIcons({ 'caret-down': caretDown, 'caret-up': caretUp, 'caret-up-down': caretUpDown });

/**
 * Component: al-table
 *
 * Renders a semantic `<table>` either from the `columns` + `data` properties
 * (data-driven mode) or from slotted `<thead>` / `<tbody>` markup (slotted
 * mode, used when `columns`/`data` are not both set). The horizontal scroll
 * container lives INSIDE the component so a wide table scrolls itself —
 * the page never scrolls. Cell/header padding uses the theme's `--al-theme-space-*`
 * tokens, so the table is automatically density-aware wherever it is rendered
 * inside a `<al-theme density="...">` scope.
 *
 * @slot - Slotted `<table>`-internal markup (e.g. `<thead>`/`<tbody>`), used only
 *   when `columns` and `data` are not both provided.
 * @csspart scroll - The horizontal scroll container.
 * @csspart table - The `<table>` element (data-driven mode only).
 *
 * @event onTableSort - Fired when a sortable header is activated. Detail: `{ key, direction }`.
 *   `al-table` does not re-sort `data` itself — it tracks and displays the active sort
 *   state (`sortKey`/`sortDirection`, reflected via `aria-sort`); re-render with sorted
 *   `data` in response to this event.
 * @event onTableRowSelect - Fired when a row's selection checkbox is toggled. Detail:
 *   `{ rowKey, isSelected, selectedRowKeys }`.
 * @event onTableSelectAll - Fired when the header's select-all checkbox is toggled. Detail:
 *   `{ isSelected, selectedRowKeys }`.
 */
export class ALTable extends ALElement {
  static el = 'al-table';

  private elementMap = register({
    elements: [
      [ALCheckbox.el, ALCheckbox],
      [ALIcon.el, ALIcon]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private checkboxEl = unsafeStatic(this.elementMap.get(ALCheckbox.el));
  private iconEl = unsafeStatic(this.elementMap.get(ALIcon.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Column definitions for data-driven rendering. Must be paired with `data`.
   */
  @property({ attribute: false })
  accessor columns: Array<ALTableColumn>;

  /**
   * Row data for data-driven rendering. Must be paired with `columns`.
   * When either `columns` or `data` is not provided, the default slot is
   * rendered instead so a consumer may supply their own `<thead>`/`<tbody>`.
   */
  @property({ attribute: false })
  accessor data: Array<ALTableRow>;

  /**
   * The property on each row object used to derive a stable row identifier
   * (used for selection tracking and the `key` attribute).
   */
  @property()
  accessor rowKey: string = 'id';

  /**
   * Visible table caption. Also used as the accessible name of the scroll
   * container so keyboard users know what they're scrolling.
   */
  @property()
  accessor caption: string;

  /**
   * Visually hides the caption while keeping it in the accessibility tree.
   */
  @property({ type: Boolean })
  accessor hideCaption: boolean;

  /**
   * Shows a leading checkbox column for row selection.
   */
  @property({ type: Boolean })
  accessor isSelectable: boolean;

  /**
   * The currently selected row keys (data-driven mode). Toggled internally
   * as checkboxes are activated; read this back to persist a selection.
   */
  @property({ attribute: false })
  accessor selectedRowKeys: Array<string> = [];

  /**
   * The `key` of the column currently sorted, if any.
   */
  @property()
  accessor sortKey: string;

  /**
   * The sort direction of `sortKey`. Mirrors the `aria-sort` vocabulary.
   */
  @property()
  accessor sortDirection: ALTableSortDirection = 'none';

  /**
   * Query the generated column definitions
   */
  private get isDataDriven(): boolean {
    return Array.isArray(this.columns) && Array.isArray(this.data);
  }

  connectedCallback() {
    super.connectedCallback();
    this.selectedRowKeys = this.selectedRowKeys ?? [];
  }

  /**
   * Handle activating a sortable column header.
   * 1. A different column was clicked — start it at ascending.
   * 2. The same column cycles ascending -> descending -> none (unsorted).
   */
  private handleSort(key: string) {
    if (this.sortKey !== key) {
      /* 1 */
      this.sortKey = key;
      this.sortDirection = 'ascending';
    } else if (this.sortDirection === 'ascending') {
      /* 2 */
      this.sortDirection = 'descending';
    } else if (this.sortDirection === 'descending') {
      this.sortKey = undefined;
      this.sortDirection = 'none';
    } else {
      this.sortDirection = 'ascending';
    }

    this.dispatch({
      eventName: 'onTableSort',
      detailObj: { key: this.sortKey, direction: this.sortDirection }
    });
  }

  private rowKeyFor(row: ALTableRow): string {
    return String(row[this.rowKey] ?? '');
  }

  private handleSelectAll() {
    const allKeys = (this.data ?? []).map((row) => this.rowKeyFor(row));
    const isSelectingAll = (this.selectedRowKeys?.length ?? 0) !== allKeys.length;
    this.selectedRowKeys = isSelectingAll ? allKeys : [];
    this.dispatch({
      eventName: 'onTableSelectAll',
      detailObj: { isSelected: isSelectingAll, selectedRowKeys: this.selectedRowKeys }
    });
  }

  private handleRowSelect(rowKey: string) {
    const selected = new Set(this.selectedRowKeys ?? []);
    const isSelected = !selected.has(rowKey);
    if (isSelected) {
      selected.add(rowKey);
    } else {
      selected.delete(rowKey);
    }
    this.selectedRowKeys = [...selected];
    this.dispatch({
      eventName: 'onTableRowSelect',
      detailObj: { rowKey, isSelected, selectedRowKeys: this.selectedRowKeys }
    });
  }

  private renderHeaderCell(column: ALTableColumn) {
    const align = column.align ?? 'start';
    const style = `text-align:${align};${column.width ? `width:${column.width};` : ''}`;

    if (!column.isSortable) {
      return html` <th scope="col" class="al-c-table__cell al-c-table__cell--header" style=${style}>${column.label}</th> `;
    }

    const isActiveColumn = this.sortKey === column.key;
    const direction: ALTableSortDirection = isActiveColumn ? this.sortDirection : 'none';
    const iconName = direction === 'ascending' ? 'caret-up' : direction === 'descending' ? 'caret-down' : 'caret-up-down';

    return html`
      <th scope="col" class="al-c-table__cell al-c-table__cell--header" style=${style} aria-sort=${direction}>
        <button type="button" class="al-c-table__sort-button" @click=${() => this.handleSort(column.key)}>
          <span>${column.label}</span>
          <${this.iconEl} class="al-c-table__sort-icon" name=${iconName} size="sm"></${this.iconEl}>
        </button>
      </th>
    `;
  }

  private renderRow(row: ALTableRow) {
    const rowKey = this.rowKeyFor(row);
    const isSelected = this.isSelectable && !!this.selectedRowKeys?.includes(rowKey);
    const rowClassNames = classMap({ 'al-c-table__row': true, 'al-is-selected': isSelected });

    return html`
      <tr class=${rowClassNames} data-row-key=${rowKey}>
        ${this.isSelectable
          ? html`
              <td class="al-c-table__cell al-c-table__select-cell">
                <${this.checkboxEl}
                  hideLabel
                  fieldId="al-table-row-${rowKey}"
                  ?isChecked=${isSelected}
                  @onCheckboxChange=${() => this.handleRowSelect(rowKey)}
                >
                  Select row
                </${this.checkboxEl}>
              </td>
            `
          : ''}
        ${this.columns.map((column) => {
          const style = `text-align:${column.align ?? 'start'};`;
          return html`<td class="al-c-table__cell" style=${style}>${row[column.key] as unknown as string}</td>`;
        })}
      </tr>
    `;
  }

  private renderGeneratedTable() {
    const allKeys = (this.data ?? []).map((row) => this.rowKeyFor(row));
    const selectedCount = this.selectedRowKeys?.length ?? 0;
    const isAllSelected = allKeys.length > 0 && selectedCount === allKeys.length;
    const isIndeterminate = selectedCount > 0 && !isAllSelected;

    return html`
      <table class="al-c-table__table" part="table">
        ${this.caption
          ? html`<caption class=${classMap({ 'al-c-table__caption': true, 'al-u-is-vishidden': this.hideCaption })}>${this.caption}</caption>`
          : ''}
        <thead>
          <tr>
            ${this.isSelectable
              ? html`
                  <th scope="col" class="al-c-table__cell al-c-table__cell--header al-c-table__select-cell">
                    <${this.checkboxEl}
                      hideLabel
                      fieldId="al-table-select-all"
                      ?isChecked=${isAllSelected}
                      ?isIndeterminate=${isIndeterminate}
                      @onCheckboxChange=${this.handleSelectAll}
                    >
                      Select all rows
                    </${this.checkboxEl}>
                  </th>
                `
              : ''}
            ${this.columns.map((column) => this.renderHeaderCell(column))}
          </tr>
        </thead>
        <tbody>
          ${(this.data ?? []).map((row) => this.renderRow(row))}
        </tbody>
      </table>
    `;
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-table', {
      'al-c-table--selectable': this.isSelectable === true
    });

    return html`
      <div class="${componentClassNames}">
        <div class="al-c-table__scroll" part="scroll" tabindex="0" role="group" aria-label=${ifDefined(this.caption)}>
          ${this.isDataDriven ? this.renderGeneratedTable() : html`<slot></slot>`}
        </div>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALTable.el) === undefined) {
  customElements.define(ALTable.el, ALTable);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-table': ALTable;
  }
}
