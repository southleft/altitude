/**
 * Column definition for the data-driven rendering mode of `<al-table>`.
 */
export interface ALTableColumn {
  /** Property key read off each row object in `data`. */
  key: string;
  /** Visible column header text. */
  label: string;
  /** Renders the header as an interactive sort button and sets `aria-sort`. */
  isSortable?: boolean;
  /** Optional CSS width value (e.g. `'20%'`, `'12rem'`) applied to the column. */
  width?: string;
  /** Text alignment for both the header and body cells in this column. Defaults to `'start'`. */
  align?: 'start' | 'center' | 'end';
}

/**
 * A single row of data. Keys are looked up by `ALTableColumn.key` and by
 * the table's `rowKey` property to derive a stable row identifier.
 */
export type ALTableRow = Record<string, unknown>;

/** `aria-sort` vocabulary, reused directly as the component's `sortDirection` property. */
export type ALTableSortDirection = 'ascending' | 'descending' | 'none';
