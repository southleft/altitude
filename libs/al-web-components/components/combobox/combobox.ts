import { TemplateResult, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import { caretDown, x } from '../icon/glyphs';
import { registerIcons } from '../icon/registry';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALButton } from '../button/button';
import { ALDropdownPanel } from '../dropdown-panel/dropdown-panel';
import { ALFieldNote } from '../field-note/field-note';
import { ALIcon } from '../icon/icon';
import { ALInput } from '../input/input';
import { ALList } from '../list/list';
import { ALListItem } from '../list-item/list-item';
import { ALComboboxItem } from './combobox.model';
import styles from './combobox.scss';

registerIcons({ 'caret-down': caretDown, x });

/**
 * Component: al-combobox
 *
 * A text input with a filtered listbox popup, following the WAI-ARIA
 * combobox/listbox/option pattern. Reuses `al-dropdown-panel` for the popup
 * surface, `al-list`/`al-list-item` for options, and `al-input` for the
 * field — the same primitives `al-select` and `al-search` are built on —
 * rather than reinventing popover positioning or option rendering.
 *
 * Filtering is either automatic (`filterMode="auto"`, the default —
 * `items` is filtered client-side by a case-insensitive substring match on
 * `label`) or manual (`filterMode="manual"` — the consumer listens for
 * `onComboboxFilter` and reassigns `items` themselves, e.g. from an async
 * API call).
 *
 * @slot field-note - If content is slotted, it will display in place of the fieldNote property
 * @slot error - If content is slotted, it will display in place of the errorNote property
 *
 * @event onComboboxFilter - Fired as the input text changes, before filtering is applied. Detail: `{ query }`.
 * @event onComboboxChange - Fired when an option is selected. Detail: `{ value, label, item }`.
 * @event onComboboxOpen - Fired when the listbox opens. Detail: `{ active }` — always `true`.
 * @event onComboboxClose - Fired when the listbox closes. Detail: `{ active }` — always `false`.
 */
export class ALCombobox extends ALElement {
  static el = 'al-combobox';

  private elementMap = register({
    elements: [
      [ALButton.el, ALButton],
      [ALDropdownPanel.el, ALDropdownPanel],
      [ALFieldNote.el, ALFieldNote],
      [ALIcon.el, ALIcon],
      [ALInput.el, ALInput],
      [ALList.el, ALList],
      [ALListItem.el, ALListItem]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private buttonEl = unsafeStatic(this.elementMap.get(ALButton.el));
  private dropdownPanelEl = unsafeStatic(this.elementMap.get(ALDropdownPanel.el));
  private fieldNoteEl = unsafeStatic(this.elementMap.get(ALFieldNote.el));
  private iconEl = unsafeStatic(this.elementMap.get(ALIcon.el));
  private inputEl = unsafeStatic(this.elementMap.get(ALInput.el));
  private listEl = unsafeStatic(this.elementMap.get(ALList.el));
  private listItemEl = unsafeStatic(this.elementMap.get(ALListItem.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * The options offered by the combobox.
   */
  @property({ attribute: false })
  accessor items: Array<ALComboboxItem> = [];

  /**
   * How `items` is filtered as the user types.
   * - **auto** filters `items` client-side by a case-insensitive substring match on `label`
   * - **manual** performs no client-side filtering — listen for `onComboboxFilter` and
   *   reassign `items` yourself (e.g. after an async request)
   */
  @property()
  accessor filterMode: 'auto' | 'manual' = 'auto';

  /**
   * The unique id of the field
   */
  @property()
  accessor fieldId: string;

  /**
   * The combobox's label
   */
  @property()
  accessor label: string = 'Label';

  /**
   * Hide the label?
   */
  @property({ type: Boolean })
  accessor hideLabel: boolean;

  /**
   * The current text in the input. Reflects the selected option's label once
   * an option has been chosen.
   */
  @property()
  accessor value: string = '';

  /**
   * The `value` of the currently selected option, if any. `undefined` while
   * the user is typing a query that doesn't match a committed selection.
   */
  @property()
  accessor selectedValue: string;

  /**
   * Placeholder attribute
   */
  @property()
  accessor placeholder: string;

  /**
   * Text shown in the popup when no options match the current query.
   */
  @property()
  accessor noResultsText: string = 'No results found';

  /**
   * Is the listbox popup open?
   */
  @property({ type: Boolean })
  accessor isActiveDropdown: boolean;

  /**
   * **Combobox alignment**
   * - **bottom** Popup appears below the field
   * - **top** Popup appears above the field
   */
  @property()
  accessor align: 'bottom' | 'top' = 'bottom';

  /**
   * The combobox field note
   */
  @property()
  accessor fieldNote: string;

  /**
   * The combobox error note
   */
  @property()
  accessor errorNote: string;

  /**
   * Aria describedby
   */
  @property()
  accessor ariaDescribedBy: string;

  /**
   * The combobox's required attribute
   */
  @property({ type: Boolean })
  accessor isRequired: boolean;

  /**
   * Optional state
   */
  @property({ type: Boolean })
  accessor isOptional: boolean;

  /**
   * The combobox's disabled attribute
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Error state
   */
  @property({ type: Boolean })
  accessor isError: boolean;

  /**
   * Index of the keyboard-highlighted option within `filteredItems`, or `-1` when none.
   */
  @state()
  private accessor activeIndex: number = -1;

  private listboxId: string;

  get filteredItems(): Array<ALComboboxItem> {
    const items = this.items ?? [];
    if (this.filterMode === 'manual' || !this.value) {
      return items;
    }
    const query = this.value.toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(query));
  }

  constructor() {
    super();
    this.handleOnClickOutside = this.handleOnClickOutside.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.fieldId = this.fieldId || nanoid();
    this.listboxId = this.listboxId || nanoid();
    document.addEventListener('mousedown', this.handleOnClickOutside, false);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('mousedown', this.handleOnClickOutside, false);
  }

  /**
   * Handle click outside the component
   * Mirrors al-select's click-outside handling.
   */
  private handleOnClickOutside(e: MouseEvent) {
    if (!this.isActiveDropdown) {
      return;
    }
    if (!this.shadowRoot?.host) {
      throw Error('Could not determine combobox context during click handler');
    }
    const didClickInside = e.composedPath().includes(this.shadowRoot.host);
    if (this.isActiveDropdown && !didClickInside) {
      this.closeDropdown();
    }
  }

  private openDropdown() {
    if (this.isDisabled || this.isActiveDropdown) {
      return;
    }
    this.isActiveDropdown = true;
    this.dispatch({ eventName: 'onComboboxOpen', detailObj: { active: true } });
    // Position the panel based on the available viewport space, mirroring al-select.
    setTimeout(() => {
      const panel = this.shadowRoot?.querySelector<HTMLElement>('.al-c-combobox__panel')?.getBoundingClientRect();
      const body = this.closest('#root-inner') || document.querySelector('body');
      const bodyPosition = body?.getBoundingClientRect();
      if (panel && bodyPosition && bodyPosition.height > panel.height && panel.bottom > bodyPosition.bottom) {
        this.align = 'top';
      }
    }, 0);
  }

  private closeDropdown() {
    if (!this.isActiveDropdown) {
      return;
    }
    this.isActiveDropdown = false;
    this.activeIndex = -1;
    this.dispatch({ eventName: 'onComboboxClose', detailObj: { active: false } });
  }

  private handleInput(e: Event) {
    this.value = (e.target as HTMLInputElement).value;
    this.selectedValue = undefined;
    this.activeIndex = -1;
    if (!this.isActiveDropdown) {
      this.openDropdown();
    }
    this.dispatch({ eventName: 'onComboboxFilter', detailObj: { query: this.value } });
  }

  private handleClear() {
    this.value = '';
    this.selectedValue = undefined;
    this.activeIndex = -1;
    this.dispatch({ eventName: 'onComboboxFilter', detailObj: { query: '' } });
    this.shadowRoot?.querySelector<HTMLInputElement>('.al-c-combobox__input')?.focus();
  }

  private selectItem(item: ALComboboxItem | undefined) {
    if (!item || item.disabled) {
      return;
    }
    this.value = item.label;
    this.selectedValue = item.value ?? item.label;
    this.closeDropdown();
    this.dispatch({
      eventName: 'onComboboxChange',
      detailObj: { value: this.selectedValue, label: item.label, item }
    });
    this.shadowRoot?.querySelector<HTMLInputElement>('.al-c-combobox__input')?.focus();
  }

  private firstEnabledIndex(items: Array<ALComboboxItem>): number {
    return items.findIndex((item) => !item.disabled);
  }

  private lastEnabledIndex(items: Array<ALComboboxItem>): number {
    for (let i = items.length - 1; i >= 0; i--) {
      if (!items[i].disabled) {
        return i;
      }
    }
    return -1;
  }

  private moveActive(delta: 1 | -1) {
    const items = this.filteredItems;
    if (!items.length) {
      return;
    }
    let index = this.activeIndex;
    for (let step = 0; step < items.length; step++) {
      index = (index + delta + items.length) % items.length;
      if (!items[index].disabled) {
        this.activeIndex = index;
        return;
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    const items = this.filteredItems;

    switch (e.code) {
      case 'ArrowDown':
        e.preventDefault();
        if (!this.isActiveDropdown) {
          this.openDropdown();
          this.activeIndex = this.firstEnabledIndex(items);
        } else {
          this.moveActive(1);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!this.isActiveDropdown) {
          this.openDropdown();
          this.activeIndex = this.lastEnabledIndex(items);
        } else {
          this.moveActive(-1);
        }
        break;
      case 'Home':
        if (this.isActiveDropdown) {
          e.preventDefault();
          this.activeIndex = this.firstEnabledIndex(items);
        }
        break;
      case 'End':
        if (this.isActiveDropdown) {
          e.preventDefault();
          this.activeIndex = this.lastEnabledIndex(items);
        }
        break;
      case 'Enter':
        if (this.isActiveDropdown && this.activeIndex > -1) {
          e.preventDefault();
          this.selectItem(items[this.activeIndex]);
        }
        break;
      case 'Escape':
        if (this.isActiveDropdown) {
          e.preventDefault();
          this.closeDropdown();
        }
        break;
      case 'Tab':
        this.closeDropdown();
        break;
      default:
        break;
    }
  }

  private optionId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-combobox', {
      'al-is-disabled': this.isDisabled,
      'al-is-required': this.isRequired,
      'al-is-error': this.isError,
      'al-has-hidden-label': this.hideLabel === true,
      'al-is-active-dropdown': this.isActiveDropdown === true,
      'al-c-combobox--align-bottom': this.align === 'bottom',
      'al-c-combobox--align-top': this.align === 'top'
    });

    const items = this.filteredItems;
    const activeId = this.activeIndex > -1 ? this.optionId(this.activeIndex) : undefined;

    return html`
      <div class="${componentClassNames}">
        <div class="al-c-combobox__container">
          <${this.inputEl}
            class="al-c-combobox__input"
            type="text"
            role="combobox"
            label="${this.label}"
            id="${this.fieldId}"
            value="${ifDefined(this.value)}"
            ?hideLabel="${this.hideLabel}"
            ?isRequired="${this.isRequired}"
            ?isOptional="${this.isOptional}"
            ?isDisabled="${this.isDisabled}"
            ?isError="${this.isError}"
            aria-describedby="${ifDefined(this.ariaDescribedBy)}"
            aria-expanded=${this.isActiveDropdown === true}
            aria-controls=${this.listboxId}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-activedescendant=${ifDefined(activeId)}
            placeholder="${ifDefined(this.placeholder)}"
            @click=${this.openDropdown}
            @input=${this.handleInput}
            @keydown=${this.handleKeyDown}
          >
            ${this.value && !this.isDisabled
              ? html`
                  <${this.buttonEl} slot="after" class="al-c-combobox__clear-button" ?hideText=${true} variant="bare" @click=${this.handleClear}>
                    Clear
                    <${this.iconEl} name="x" slot="after"></${this.iconEl}>
                  </${this.buttonEl}>
                `
              : html`<${this.iconEl} slot="after" name="caret-down" class="al-c-combobox__icon-arrow"></${this.iconEl}>`}
          </${this.inputEl}>
          ${this.isActiveDropdown
            ? html`
                <${this.dropdownPanelEl} class="al-c-combobox__panel" ?hasScroll=${true}>
                  <${this.listEl} id=${this.listboxId} role="listbox" aria-label="${this.label}">
                    ${items.length
                      ? items.map(
                          (item, index) => html`
                            <${this.listItemEl}
                              id=${this.optionId(index)}
                              role="option"
                              aria-selected=${index === this.activeIndex}
                              variant="static"
                              ?isDisabled=${item.disabled}
                              ?isActive=${index === this.activeIndex}
                              ?isCurrent=${(item.value ?? item.label) === this.selectedValue}
                              @click=${() => this.selectItem(item)}
                            >
                              ${item.label}
                            </${this.listItemEl}>
                          `
                        )
                      : html`<div class="al-c-combobox__empty">${this.noResultsText}</div>`}
                  </${this.listEl}>
                </${this.dropdownPanelEl}>
              `
            : ''}
        </div>
        ${this.fieldNote || this.slotNotEmpty('field-note')
          ? html`
              <slot name="field-note">
                <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} id=${ifDefined(this.ariaDescribedBy)}> ${this.fieldNote} </${this.fieldNoteEl}>
              </slot>
            `
          : html``}
        ${(this.errorNote || this.slotNotEmpty('error')) && this.isError
          ? html`
              <slot name="error">
                <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} ?isError=${true}> ${this.errorNote} </${this.fieldNoteEl}>
              </slot>
            `
          : html``}
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALCombobox.el) === undefined) {
  customElements.define(ALCombobox.el, ALCombobox);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-combobox': ALCombobox;
  }
}
