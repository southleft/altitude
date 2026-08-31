/**
 * A single option offered by `<al-combobox>`.
 */
export interface ALComboboxItem {
  /** Visible option text, and what gets matched against the query in `filterMode="auto"`. */
  label: string;
  /** The value reported on selection. Falls back to `label` when omitted. */
  value?: string;
  /** Renders the option in a non-interactive, non-selectable state. */
  disabled?: boolean;
}
