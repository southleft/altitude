import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLCheckbox } from '../checkbox/checkbox';
import { SLDropdownPanel } from '../dropdown-panel/dropdown-panel';
import { SLFieldNote } from '../field-note/field-note';
import { SLIconChevronDown } from '../icon/icons/chevron-down';
import { SLListItem } from '../list-item/list-item';
import { SLSearch } from '../search/search';
import { SLInput } from '../input/input';
import { PartialDataSource } from './select.model';
import styles from './select.scss';

/**
 * Component: sl-select
 *
 * Select presents a list of options from which a user can select one.
 * - **slot**: The select content
 * - **slot** "field-note": If content is slotted, it will display in place of the fieldNote property
 * - **slot** "error": If content is slotted, it will display in place of the errorNote property
 */
export class SLSelect extends SLElement {
  static el = 'sl-select';

  private elementMap = register({
    elements: [
      [SLDropdownPanel.el, SLDropdownPanel],
      [SLFieldNote.el, SLFieldNote],
      [SLIconChevronDown.el, SLIconChevronDown],
      [SLInput.el, SLInput],
      [SLSearch.el, SLSearch],
      [SLListItem.el, SLListItem],
      [SLCheckbox.el, SLCheckbox]
    ],
    suffix: (globalThis as any).slAutoRegistry === true ? '' : PackageJson.version
  });

  private dropdownPanelEl = unsafeStatic(this.elementMap.get(SLDropdownPanel.el));
  private fieldNoteEl = unsafeStatic(this.elementMap.get(SLFieldNote.el));
  private iconChevronDownEl = unsafeStatic(this.elementMap.get(SLIconChevronDown.el));
  private inputEl = unsafeStatic(this.elementMap.get(SLInput.el));
  private searchEl = unsafeStatic(this.elementMap.get(SLSearch.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * is Active
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * is Active select
   * 1. Select is open when set to true. Close when set to false
   */
  @property({ type: Boolean })
  accessor isActiveDropdown: boolean;

  /**
   * The unique id of the select
   */
  @property()
  accessor fieldId: string;

  /**
   * The select's title
   */
  @property()
  accessor title: string;

  /**
   * The select's label
   */
  @property()
  accessor label: string = 'Label';

  /**
   * Select Datasource
   */
  @property({ attribute: false })
  accessor dataSource: Array<PartialDataSource>;

  /**
   * The select's name attribute
   */
  @property()
  accessor name: string;

  /**
   * The select's value attribute
   */
  @property()
  accessor value: string;

  /**
   * Placeholder attribute
   * - Specifies a short hint that describes the expected value of an <input> element
   */
  @property()
  accessor placeholder: string;

  /**
   * The select field note
   */
  @property()
  accessor fieldNote: string;

  /**
   * The select error note
   */
  @property()
  accessor errorNote: string;

  /**
   * Aria describedby
   * 1. Used to connect the field note in select to the select menu for accessibility
   */
  @property()
  accessor ariaDescribedBy: string;

  /**
   * The select's required attribute
   */
  @property({ type: Boolean })
  accessor isRequired: boolean = false;

  /**
   * Optional state
   * - Specifies that a field is optional and adds the text 'optional' to the label
   */
  @property({ type: Boolean })
  accessor isOptional: boolean;

  /**
   * The select's disabled attribute
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Error state
   */
  @property({ type: Boolean })
  accessor isError: boolean;

  /**
   * Readonly attribute
   * - Specifies that an input field is read-only
   */
  @property({ type: Boolean })
  accessor isReadonly: boolean = true;

  /**
   * Hide the label?
   */
  @property({ type: Boolean })
  accessor hideLabel: boolean;

  /**
   * Add a search input to the dropdown panel
   */
  @property({ type: Boolean })
  accessor hasSearch: boolean = false;

  /**
   * **Select alignment**
   * - **bottom** Dropdown panel appears on the bottom
   * - **top** Dropdown panel appears on the top
   */
  @property()
  accessor align: 'bottom' | 'top' = 'bottom';

  /* Active item */
  private activeElement: SLListItem;

  /**
   * Query all the list items
   */
  get listItems(): Array<SLListItem> {
    return [...this.querySelectorAll<SLListItem>(this.elementMap.get(SLListItem.el))];
  }

  /**
   * Initialize functions
   */
  constructor() {
    super();
    this.handleOnClickOutside = this.handleOnClickOutside.bind(this);
    this.handleOnChange = this.handleOnChange.bind(this);
  }

  /**
   * Connected Callback lifecycle
   * 1. Close dropdown panel when you click outside of the element
   * 2. Autogenerate the fieldID
   */
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('mousedown', this.handleOnClickOutside, false); /* 1 */
    this.fieldId = this.fieldId || nanoid(); /* 2 */
  }

  /**
   * Disconnected callback lifecycle
   * 1. Remove event listeners
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('mousedown', this.handleOnClickOutside, false);
  }

  /**
   * Handle auto expand(isActiveDropdown : true default)
   */
  firstUpdated() {
    if (this.isActiveDropdown) {
      this.handleOnActiveDropdown();
    }
    setTimeout(() => {
      this.addClickHandlers();
    }, 1);
  }

  /**
   * Handle click outside the component
   * 1. Close the show hide panel on click outside
   * 2. If the nav is already closed then we don't care about outside clicks and we
   * can bail early
   * 3. By the time a user clicks on the page the shadowRoot will almost certainly be
   * defined, but TypeScript isn't that trusting and sees this.shadowRoot as possibly
   * undefined. To work around that we'll check that we have a shadowRoot (and a
   * rendered .host) element here to appease the TypeScript compiler. This should never
   * actually be shown or run for a human end user.
   * 4. Check to see if we clicked inside the active panel
   * 5. If the panel is active and we've clicked outside of the panel then it should
   * be closed.
   */
  handleOnClickOutside(e: MouseEvent) {
    /* 2 */
    if (!this.isActiveDropdown) {
      return;
    }
    /* 3 */
    if (!this.shadowRoot?.host) {
      throw Error('Could not determine panel context during click handler');
    }
    /* 4 */
    const didClickInside = e.composedPath().includes(this.shadowRoot.host);
    /* 5 */
    if (this.isActiveDropdown && !didClickInside) {
      this.toggleActive();
    }
  }

  /**
   * Set menu active state
   * 1. Toggle the active state between true and false
   */
  toggleActive() {
    this.isActiveDropdown = !this.isActiveDropdown; /* 1 */
    if (this.activeElement) {
      this.activeElement.isActive = false;
    }
    if (this.isActiveDropdown === true) {
      this.handleOnActiveDropdown();
      this.dispatch({ eventName: 'onSelectOpen', detailObj: { active: true } });
    } else {
      this.dispatch({ eventName: 'onSelectClose', detailObj: { active: false } });
    }
  }

  /**
   * Handles the activation behavior of the select:
   * 1. Positions the dropdown panel based on available viewport space
   * 2. Sets focus to the first element in the dropdown panel or the search box (if available) when active
   * 3. When the select is active:
   *    3.1. If hasSearch is false and a value is available, focuses on the selected item & scrolls to view it
   *    3.2. If hasSearch is true and a value is available, focuses on the search box (no need to focus the active element) & scrolls to view it
   * 4. When the select is active and no value is available:
   *    4.1. If hasSearch is false, focuses on the first non-disabled element
   *    4.2. If hasSearch is true, as the search box has focus, no need to focus the first non-disabled element
   */
  handleOnActiveDropdown() {
    setTimeout(() => {
      const dropdownPanel = this.shadowRoot.querySelector<HTMLElement>('.sl-c-select__panel')?.getBoundingClientRect();
      const body = this.closest('#root-inner') || document.querySelector('body');
      const bodyPosition = body.getBoundingClientRect();
      if (bodyPosition.height > dropdownPanel?.height && dropdownPanel?.bottom > bodyPosition.bottom) {
        /* Position dropdown panel based on viewport space */
        this.align = 'top'; /* 1 */
      }

      /* 2 */
      if (this.value) {
        /* Handle focus and scroll for a selected value */
        this.activeElement = this.listItems[this.dataSource?.findIndex((obj) => obj.label === this.value)] as SLListItem;
        if (this.activeElement) {
          this.activeElement.isActive = true;
          if (!this.hasSearch) {
            /* Focus on the selected item if hasSearch is false */
            (this.activeElement.shadowRoot.querySelector('.sl-c-list-item__link') as HTMLAnchorElement).focus(); /* 3.1 */
          }
          // Scroll to the Active item
          const panel = this.shadowRoot.querySelector(this.elementMap.get(SLDropdownPanel.el)).shadowRoot.querySelector('.sl-c-dropdown-panel__body');
          const searchHeight = this.hasSearch
            ? this.shadowRoot.querySelector(this.elementMap.get(SLDropdownPanel.el)).shadowRoot.querySelector('.sl-c-dropdown-panel__header')
                ?.clientHeight
            : 0;
          panel.scrollTop = this.activeElement?.offsetTop - searchHeight || 0;
        }
      } else if (!this.hasSearch) {
        /* Focus on the first non-disabled element if no value and no search box */
        const firstNonDisabled = Array.from(this.listItems).find((item: SLListItem) => !item.isDisabled);
        firstNonDisabled?.shadowRoot.querySelector<HTMLButtonElement | HTMLAnchorElement>('.sl-c-list-item__link').focus(); /* 4.1 */
      }
    }, 0);
  }

  /**
   * Handle on select input keydown
   * 1. If key selected is enter or spacebar, toggle the menu open/close
   */
  handleOnKeydown(e: KeyboardEvent) {
    if (e.code === 'Enter' || e.code === 'Space') {
      this.toggleActive();
    }
  }

  /**
   * Handle on keydown
   * 1. If the panel is open and escape is keyed, close the menu and return focus to the trigger button
   * 2. Find the last item in the list. Set the last element to that item to define variable
   * 3. If the last element is defined, once Tab is selected after that the panel will close
   */
  handleOnKeydownDropdownPanel(e: KeyboardEvent) {
    if (this.isActiveDropdown === true && e.code === 'Escape') {
      this.toggleActive();
    }

    if (this.listItems) {
      let lastFocusableElement;
      for (let i = this.listItems.length - 1; i >= 0; i--) {
        if (!this.listItems[i].shadowRoot.querySelector('.sl-c-list-item.sl-is-disabled')) {
          lastFocusableElement = this.listItems[i];
          break;
        }
      }

      let lastElement;
      if (document.activeElement === lastFocusableElement) {
        lastElement = lastFocusableElement; /* 2 */
      }
      if (lastElement) {
        if (this.isActiveDropdown === true && e.code === 'Tab') {
          this.toggleActive(); /* 3 */
        }
      }
    }
  }

  /**
   * Lifecycle method triggered when the component is first updated on the page
   * 1. Attaches click handlers to SLListItem components within the select that do not contain children
   * 2. If the component is not readonly, clears the input value
   * 3. If the component is not readonly, focuses on the select after selecting an item
   * 4. Sets the select value with the text content of the selected list item
   * 5. Resizes the select to fit the value width if the variant is bare
   * 6. Ensures only the last selected item remains active
   */
  addClickHandlers() {
    /* 1 */
    if (this.listItems) {
      this.listItems.forEach((element: SLListItem) => {
        const listItemText = element.textContent;
        const listItemTrigger = element?.shadowRoot.querySelector('.sl-c-list-item__link');
        if (listItemTrigger) {
          listItemTrigger?.addEventListener('click', () => {
            this.shadowRoot.querySelector<HTMLInputElement>('.sl-c-select__input').value = ''; /* 2 */
            this.shadowRoot.querySelector<HTMLInputElement>('.sl-c-select__input').focus(); /* 3 */
            this.value = listItemText; /* 4 */
            this.isActive = true;
            /* 6 */
            const notActive = this.listItems.filter((item: HTMLElement) => item !== element);
            notActive.forEach((item: SLListItem) => {
              item.isActive = false;
            });
            element.isActive = true;
          });
        }
      });
    }
  }

  /**
   * Change output binding
   * 1. If the input field is not readonly, then allow typing
   * 2. Clear the label & value's to show the filling text
   * 3. Set the select to active while filling
   */
  handleOnChange() {
    this.value = '';
    this.label = '';
    this.isActiveDropdown = true;
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-select', {
      'sl-is-disabled': this.isDisabled,
      'sl-is-required': this.isRequired,
      'sl-is-error': this.isError,
      'sl-is-active': this.isActive === true,
      'sl-is-active-dropdown': this.isActiveDropdown === true,
      'sl-has-search': this.hasSearch,
      'sl-has-hidden-label': this.hideLabel === true,
      'sl-c-select--align-bottom': this.align === 'bottom',
      'sl-c-select--align-top': this.align === 'top'
    });

    return html`
      <div class="${componentClassNames}">
        <div class="sl-c-select__container">
          <${this.inputEl}
            class="sl-c-select__input"
            type="text"
            label="${this.label}"
            id="${this.fieldId}"
            name="${ifDefined(this.name)}"
            value="${ifDefined(this.value)}"
            ?hideLabel="${this.hideLabel}"
            ?isReadonly=${this.isReadonly}
            ?isRequired="${this.isRequired}"
            ?isOptional="${this.isOptional}"
            ?isDisabled="${this.isDisabled}"
            ?isError="${this.isError}"
            aria-describedby="${ifDefined(this.ariaDescribedBy)}"
            placeholder="${ifDefined(this.placeholder)}"
            @click=${this.toggleActive}
            @keydown=${this.handleOnKeydown}
            @input=${this.handleOnChange}
            ?isActive="${this.isActive}"
          >
            <${this.iconChevronDownEl} size="lg" slot="after" class="sl-c-select__icon-arrow"></${this.iconChevronDownEl}>
          </${this.inputEl}>
          ${
            this.isActiveDropdown
              ? html`
                <${this.dropdownPanelEl} @keydown=${this.handleOnKeydownDropdownPanel} class="sl-c-select__panel" ?hasHeader=${this.hasSearch} ?hasScroll=${true}>
                  ${this.hasSearch ? html` <${this.searchEl} slot="header" .value=${''} ?isEmpty=${true}> </${this.searchEl}> ` : html``}
                  <slot @select=${this.toggleActive}></slot>
                </${this.dropdownPanelEl}>
              `
              : html``
          }
        </div>
        ${
          this.fieldNote || this.slotNotEmpty('field-note')
            ? html`
              <slot name="field-note">
                <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} id=${ifDefined(this.ariaDescribedBy)}> ${this.fieldNote} </${this.fieldNoteEl}>
              </slot>
            `
            : html``
        }
        ${
          (this.errorNote || this.slotNotEmpty('error')) && this.isError
            ? html`
              <slot name="error">
                <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} ?isError=${true}> ${this.errorNote} </${this.fieldNoteEl}>
              </slot>
            `
            : html``
        }
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).slAutoRegistry === true && customElements.get(SLSelect.el) === undefined) {
  customElements.define(SLSelect.el, SLSelect);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-select': SLSelect;
  }
}
