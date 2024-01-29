/* eslint-disable @typescript-eslint/no-explicit-any */
import { TemplateResult, unsafeCSS } from 'lit';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { property, query, queryAssignedElements } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLButton } from '../button/button';
import { SLDropdownPanel } from '../dropdown-panel/dropdown-panel';
import { SLFieldNote } from '../field-note/field-note';
import { SLIconClose } from '../icon/icons/close';
import { SLIconSearch } from '../icon/icons/search';
import { SLListItem } from '../list-item/list-item';
import { SLList } from '../list/list';
import { SLTextField } from '../text-field/text-field';
import styles from './search-form.scss';

export class SLSearchForm extends SLElement {
  static el = 'sl-search-form';

  private elementMap = register({
    elements: [
      [SLTextField.el, SLTextField],
      [SLFieldNote.el, SLFieldNote],
      [SLButton.el, SLButton],
      [SLDropdownPanel.el, SLDropdownPanel],
      [SLIconClose.el, SLIconClose],
      [SLIconSearch.el, SLIconSearch],
      [SLList.el, SLList],
      [SLListItem.el, SLListItem]
    ],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private textFieldEl = unsafeStatic(this.elementMap.get(SLTextField.el));
  private fieldNoteEl = unsafeStatic(this.elementMap.get(SLFieldNote.el));
  private buttonEl = unsafeStatic(this.elementMap.get(SLButton.el));
  private dropdownPanelEl = unsafeStatic(this.elementMap.get(SLDropdownPanel.el));
  private iconCloseEl = unsafeStatic(this.elementMap.get(SLIconClose.el));
  private iconSearchEl = unsafeStatic(this.elementMap.get(SLIconSearch.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * The unique id of the field
   */
  @property()
  accessor ariaControlsId: string;

  /**
   * The unique id of the field
   */
  @property()
  accessor fieldId: string;

  /**
   * Label of the form field
   */
  @property()
  accessor label: string = 'Search';

  /**
   * Description for the field
   */
  @property()
  accessor fieldNote: string;

  /**
   *  Error message for the field
   */
  @property()
  accessor errorNote: string;

  /**
   * Visually hide the label from the UI
   */
  @property({ type: Boolean })
  accessor hideLabel: boolean;

  /**
   * Search button text
   */
  @property()
  accessor buttonText: string;

  /**
   * Clear button text
   */
  @property()
  accessor clearButtonText = 'Clear text';

  /**
   * Disabled attribute
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Active state
   */
  @property({ type: Boolean })
  accessor isActive = false;

  /**
   * Active state
   */
  @property({ type: Boolean })
  accessor isActiveDropdown = false;

  /**
   * Error state
   */
  @property({ type: Boolean })
  accessor isError: boolean;

  /**
   * Placeholder text
   */
  @property()
  accessor placeholder: string = 'Find asset';

  /**
   * Input value
   */
  @property()
  accessor value: string;

  /**
   * Aria describedby
   * 1. Used to connect the field note and errorNote for accessibility
   */
  @property()
  accessor ariaDescribedBy: string;

  /**
   * is Dynamic
   */
  @property({ type: Boolean })
  accessor isDynamic: boolean;

  /**
   * Query the dynamic dropdown panel element
   */
  @query('.sl-c-search-form--dynamic .sl-c-search-form__dropdown-panel')
  accessor _enDropdownPanel: HTMLElement;

  /**
   * Position property
   */
  @property()
  accessor position: 'bottom' | 'top' = 'bottom';

  /**
   * Maxlength of characters for the search form
   */
  @property({ type: Number })
  accessor maxlength: number;

  /**
   * Focused in menu toggle
   */
  @property({ type: Boolean })
  accessor isFocusedIn: boolean;

  /**
   * Use this Flag along with emptyMessage named slot to report error message
   *
   */
  @property({ type: Boolean })
  accessor isEmpty: boolean;

  /**
   * Current selected list-item in the dropdown panel
   */
  @property({ attribute: false })
  accessor currentSelectedItem: SLListItem;

  /**
   * Active element in the dropdown panel
   * 1. This is used to read out the active value to the user
   */
  @property()
  accessor ariaActiveDescendantId: string;

  /**
   * Used for multiple keys pressed at the same time
   */
  private keysPressed = <any>{};

  @queryAssignedElements()
  accessor listItems: Array<SLListItem>;

  /**
   * First updated lifecycle when component is first updated on page
   */
  firstUpdated() {
    if (this.isDynamic) {
      setTimeout(() => {
        this.dynamicPosition();
      }, 1);
    }
    this.setLists();
  }

  /**
   * Initialize functions
   */
  constructor() {
    super();
    this.handleOnClickOutside = this.handleOnClickOutside.bind(this);
    this.clearSearchForm = this.clearSearchForm.bind(this);
    this.onChanged = this.onChanged.bind(this);
  }

  /**
   * Connected callback lifecycle
   */
  connectedCallback() {
    super.connectedCallback();
    this.fieldId = this.fieldId || nanoid();
    this.ariaControlsId = this.ariaControlsId || nanoid();
    document.addEventListener('mousedown', this.handleOnClickOutside, false);
  }

  /**
   * Disconnected callback lifecycle
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('mousedown', this.handleOnClickOutside, false);
  }

  /**
   * Change output binding
   * 1. If has input value then show the dropdown panel and clear icon
   * 2. Emit target value to outside of component to be used at application level
   */
  private onChanged(e: any) {
    this.value = e.target.value;
    if (this.value.length > 0) {
      this.isActiveDropdown = true;
    } else {
      this.isActiveDropdown = false;
      this.updateScroll(null);
    }
    this.emitOnChangeEvent(this.value);
  }

  /**
   * Close dropdown panel
   */
  closePanel() {
    this.isActiveDropdown = false;
  }

  /**
   * When the component first loads
   * 1. If the dropdown has a list as children, add the proper aria attributes to the `list`
   * and `list-item` slotted components to get proper accessibility
   */
  setLists() {
    if (this.children[0]?.outerHTML.includes(this.elementMap.get(SLList.el))) {
      const thisList = this.querySelector(this.elementMap.get(SLList.el));

      setTimeout(() => {
        thisList?.setAttribute('role', 'listbox');
        thisList?.setAttribute('aria-controls', this.ariaControlsId);
        this.listItems.forEach((item: SLListItem) => {
          item.setAttribute('role', 'option');
          item.setAttribute('id', nanoid());
        });
      }, 1);
    }
  }

  /**
   * Clear the input field on click
   * 1. Set active, clear and error to false after click
   * 2. Clear the input value after click
   * 3. Set the focus on the input after the clear
   * 4. @fires change event when we click on close icon
   */
  clearSearchForm() {
    this.isActiveDropdown = false;
    this.value = '';
    this.shadowRoot.querySelector<HTMLInputElement>('.sl-c-search-form__input').value = ''; /* 2 */
    this.isError = false;
    this.shadowRoot.querySelector<HTMLInputElement>('.sl-c-search-form__input').focus(); /* 3 */
    this.emitOnChangeEvent(null); /* 4 */
    this.isFocusedIn = false;
    this.updateScroll(null);
  }

  /**
   * Emit onChange event
   */
  private emitOnChangeEvent(value: string | null): void {
    this.dispatch({ eventName: 'onSearchFormChange', detailObj: { value } });
  }

  /**
   * Handle click outside the component
   * 1. Close the show hide panel on click outside
   * 2) If the nav is already closed then we don't care about outside clicks and we
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
      setTimeout(() => {
        this.closePanel();
      }, 1);
    }
  }

  /**
   * Set menu active state
   * 1. Toggle the active state between true and false
   * 2. If the active state is turned on, set focus to the first element in the dropdown panel
   * 3. If the active state is toggled to false, close the panel and return focus to the dropdown trigger
   * 4. If the event target has a value (list-item has value prop), then replace the input value with the list-item value
   */
  toggleActive(e: Event) {
    this.isActiveDropdown = !this.isActiveDropdown;

    if ((e.target as SLListItem).value) {
      this.shadowRoot.querySelector<HTMLInputElement>('.sl-c-search-form__input').value = (e.target as SLListItem).value as string;
      this.isActiveDropdown = true;
    }

    setTimeout(() => {
      const elem = this.shadowRoot.querySelector<HTMLInputElement>('.sl-c-search-form__input');
      this.isActiveDropdown === true ? elem.focus() : elem.blur();
    }, 100);
  }

  /**
   * Select first item in dropdown
   * 1. Set the current selected item to the first item of the dropdown list
   * 2. Add `aria-selected` to first item to show selected state in listbox dropdown
   * 3. Change the `aria-activedescendant` value in input to the id of the selected item
   */
  focusOnFirstItem() {
    for (let i = 0; i < this.listItems.length; i++) {
      if (!this.listItems[i]?.isDisabled) {
        this.currentSelectedItem = this.listItems[i]; /* 1 */
        break;
      }
    }

    this.currentSelectedItem?.setAttribute('aria-selected', 'true'); /* 2 */
    this.ariaActiveDescendantId = this.currentSelectedItem?.getAttribute('id'); /* 3 */
  }

  /**
   * Select last item in dropdown
   * 1. Set the current selected item to the last item of the dropdown list
   * 2. Add `aria-selected` to last item to show selected state in listbox dropdown
   * 3. Change the `aria-activedescendant` value in input to the id of the selected item
   */
  focusOnLastItem() {
    for (let i = this.listItems.length - 1; i >= 0; i--) {
      if (!this.listItems[i]?.isDisabled) {
        this.currentSelectedItem = this.listItems[i]; /* 1 */
        break;
      }
    }
    this.currentSelectedItem?.setAttribute('aria-selected', 'true'); /* 2 */
    this.ariaActiveDescendantId = this.currentSelectedItem?.getAttribute('id'); /* 3 */
  }

  /**
   * Remove aria selected
   * 1. Remove aria-selected from all list items and set currentSelectedItem to none
   */

  removeAriaSelected() {
    for (let i = this.listItems.length - 1; i >= 0; i--) {
      if (this.listItems[i]?.getAttribute('aria-selected') === 'true') {
        this.listItems[i]?.removeAttribute('aria-selected');
        setTimeout(() => {
          this.currentSelectedItem = undefined;
        }, 1);
      }
    }
  }

  /**
   * Update the scroll of the dropdown panel body
   * 1)If selected item is not defined, the dropdown panel scroll is set to top
   * 2. If the current selected item is defined and dropdown panel scrollHeight is greater than the clientHeight,
   * then calculate the scroll distance from the bottom of the panel. Also calculate the bottom of the element.
   * 3. If the bottom of the list is greater than the scroll bottom, scroll the panel the difference
   * between the bottom of the element and dropdown panel body client height.
   * 4. If the current selected item offset top is less than the dropdown panel body scroll top,
   * then scroll the list to the top.
   */
  updateScroll(selectedItem: SLListItem) {
    const dropdownPanelBody = this?.shadowRoot
      .querySelector(this.elementMap.get(SLDropdownPanel.el))
      ?.shadowRoot.querySelector('.sl-c-dropdown-panel__body');
    if (selectedItem === null && dropdownPanelBody) {
      dropdownPanelBody.scrollTop = 0; /* 1 */
    }
    if (selectedItem && dropdownPanelBody.scrollHeight > dropdownPanelBody.clientHeight) {
      const scrollBottom = dropdownPanelBody.clientHeight + dropdownPanelBody.scrollTop; /* 2 */
      const elementBottom = selectedItem.offsetTop + selectedItem.offsetHeight; /* 2 */
      if (elementBottom > scrollBottom) {
        dropdownPanelBody.scrollTop = elementBottom - dropdownPanelBody.clientHeight; /* 3 */
      } else if (selectedItem.offsetTop < dropdownPanelBody.scrollTop) {
        dropdownPanelBody.scrollTop = selectedItem.offsetTop; /* 4 */
      }
    }
  }

  /**
   * Handle on keydown
   * 1. If the dropdown panel is open and escape is keyed, close the menu and return focus to the trigger button
   * 2. If the dropdown panel is active but not arrowed into yet and arrow down (or arrow up when dropdown is above search form)
   *  is keyed, move the `aria-selected` state into the first list item.
   * A while condition is added, so that if there are disabled list items in panel, then it will be skipped and the focus
     will be kept to the first non-disabled list item.
   * 3. Otherwise, if the item is focused in, run various keydown events
   * 4. When focused in panel and tabbed, focus on the clear button in the input
   * 5. When focused in panel and enter is selected on item in dropdown, change the value to the list-item value
   * prop and
   * 6. If current selected item has previous element and arrow up is selected, move `aria-selected to the previous item
   * 7. Otherwise, if If current selected item has next element and arrow down is selected, move `aria-selected to the next item
   * 8. Otherwise, if 6 isn't true when arrow up is selected when first item is aria-selected, then return the `aria-selected` state
   * to the last item
   * 9. Otherwise, if 7 isn't true and arrow down is selected when last item is aria-seleected, then return the `aria-selected` state
   * to the first item
   * 10. If the dropdown panel is active but not arrowed into yet and tab is keyed, move focus to the clear button and remove
   * 11. Update the panel scroll when the item is focused on.
   * 12. while condition added so that, it checks if the PreviousElementsibling is disabled or not. If disabled, then it keeps looping
     until it finds the previous non-disabled list-item. If it reaches the top , and if there is no such non-disabled items, then focusOnLastitem
     is called so that the focus returns back to the last non-disabled item.
   * 13. while condition added so that, it checks if the nextElementsibling is disabled or not. If disabled, then it keeps looping
     until it finds the next non-disabled list-item. If it reaches the end , and if there is no such non-disabled items, then focusOnFirstitem
     is called so that the focus returns back to the first non-disabled item.
   * 14. Use control + option + spacebar to trigger the dropdown without typing
   */

  handleKeyDown(e: KeyboardEvent) {
    /* 1 */
    if (this.isActiveDropdown === true && e.code === 'Escape') {
      this.toggleActive(e);
    }

    /* 14 */
    if (this.isActiveDropdown === false) {
      this.keysPressed[e.key] = true;
      if (this.keysPressed['Control'] && this.keysPressed['Alt'] && e.code === 'Space') {
        this.isActiveDropdown = true;
      }
    }

    /* 2 */
    if (
      (this.isActiveDropdown === true && !this.isFocusedIn && this.position !== 'top' && e.code === 'ArrowDown') ||
      (this.isActiveDropdown === true && !this.isFocusedIn && this.position === 'top' && e.code === 'ArrowUp')
    ) {
      let currentItem: SLListItem = this.querySelector(this.elementMap.get(SLList.el))?.querySelector<SLListItem>(this.elementMap.get(SLListItem.el));

      while (currentItem.isDisabled) {
        currentItem = currentItem.nextElementSibling as SLListItem;
      }
      this.currentSelectedItem = currentItem;
      this.currentSelectedItem?.setAttribute('aria-selected', 'true');
      this.ariaActiveDescendantId = this.currentSelectedItem?.getAttribute('id');
      this.isFocusedIn = true;
      this.updateScroll(this.currentSelectedItem); /* 11 */
    } else if (this.isActiveDropdown === true && !this.isFocusedIn && e.code === 'Tab') {
      /* 10 */
      setTimeout(() => {
        this.closePanel();
      }, 1);
    } else if (this.isFocusedIn === true) {
      /* 3 */
      if (e.code === 'Tab') {
        /* 4 */

        setTimeout(() => {
          this.closePanel();
          this.shadowRoot
            .querySelector<HTMLInputElement>('.sl-c-search-form__clear-button')
            .shadowRoot.querySelector<HTMLButtonElement>('.sl-c-button')
            .focus();
        }, 1);
      }
      if (e.code === 'Enter') {
        /* 5 */
        this.shadowRoot.querySelector<HTMLInputElement>('.sl-c-search-form__input').value = this.currentSelectedItem.value as string;
        setTimeout(() => {
          this.closePanel();
        }, 1);
        this.removeAriaSelected();
        this.isFocusedIn = false;
        this.currentSelectedItem.onItemClick();
      }
      if (this.currentSelectedItem?.previousElementSibling && e.code === 'ArrowUp') {
        /* 12 */
        let currentItem = this.currentSelectedItem?.previousElementSibling as SLListItem;

        while (currentItem?.isDisabled) {
          currentItem = currentItem.previousElementSibling as SLListItem;
        }
        if (currentItem === null) {
          this.currentSelectedItem.removeAttribute('aria-selected');
          this.focusOnLastItem();
          return;
        }

        this.currentSelectedItem.removeAttribute('aria-selected');
        this.currentSelectedItem = <SLListItem>currentItem;
        this.currentSelectedItem.setAttribute('aria-selected', 'true');
        this.ariaActiveDescendantId = this.currentSelectedItem.getAttribute('id');
      } else if (this.currentSelectedItem?.nextElementSibling && e.code === 'ArrowDown') {
        /* 13 */
        let currentItem = this.currentSelectedItem?.nextElementSibling as SLListItem;

        while (currentItem?.isDisabled) {
          currentItem = currentItem.nextElementSibling as SLListItem;
        }
        if (currentItem === null) {
          this.currentSelectedItem.removeAttribute('aria-selected');
          this.focusOnFirstItem();
          return;
        }

        this.currentSelectedItem.removeAttribute('aria-selected');
        this.currentSelectedItem = <SLListItem>currentItem;
        this.currentSelectedItem.setAttribute('aria-selected', 'true');
        this.ariaActiveDescendantId = this.currentSelectedItem.getAttribute('id');
      } else if (e.code === 'ArrowUp') {
        /* 8 */
        this.currentSelectedItem.removeAttribute('aria-selected');
        this.focusOnLastItem();
      } else if (e.code === 'ArrowDown') {
        /* 9 */
        this.currentSelectedItem.removeAttribute('aria-selected');
        this.focusOnFirstItem();
      }
      this.updateScroll(this.currentSelectedItem); /* 11 */
    }
  }

  /**
   * Handle key up
   * 1. Remove the multi-key-selection on key up after keydown combo is selected
   */
  handleKeyUp(e: KeyboardEvent) {
    delete this.keysPressed[e.key]; /* 1 */
  }

  /**
   * Handle all dynamic placement
   * 1. Get the botom position of the body
   * 2. Get the bottom of the input and height of the list in the dropdown to add together
   * 3. If the bottom of the input position plus the list height > bottom position of the body,
   * render the dropdown on top of the input
   * 4. Otherwise, render the dropdown below
   */
  dynamicPosition() {
    if (this._enDropdownPanel) {
      const body = document.querySelector('body');
      const bodyPosition = body.getBoundingClientRect(); /* 1 */
      const listHeight = this.querySelector(this.elementMap.get(SLList.el))?.shadowRoot?.querySelector('.sl-c-list').clientHeight; /* 2 */
      const inputBottom = this.shadowRoot.querySelector('.sl-c-search-form__input').getBoundingClientRect().bottom; /* 2 */
      const inputAndListHeight = inputBottom + listHeight; /* 2 */
      if (inputAndListHeight > bodyPosition.bottom) {
        /* 3 */
        this.position = 'top';
      } else {
        this.position = 'bottom'; /* 4 */
      }
    }
  }

  render() {
    const componentClassName = this.componentClassNames('sl-c-search-form', {
      'sl-c-search-form--with-button': this.buttonText,
      'sl-c-search-form--top': this.position === 'top',
      'sl-c-search-form--dynamic': this.isDynamic === true,
      'sl-is-disabled': this.isDisabled,
      'sl-is-error': this.isError,
      'sl-is-active': this.isActive === true,
      'sl-is-active-dropdown': this.isActiveDropdown === true,
      'sl-is-focused-in': this.isFocusedIn === true,
      'sl-has-hidden-label': this.hideLabel
    });

    const itemTemplates: SLListItem[] = [];
    this.listItems.forEach((item) => {
      item.setAttribute('value', <string>item.value);
      const newItem = unsafeHTML(item.outerHTML);
      itemTemplates.push(<SLListItem>newItem);
    });

    return html`
      <div class="${componentClassName}">
        <div class="sl-c-search-form__container">
          <${this.textFieldEl}
            class="sl-c-search-form__input"
            type="text"
            id="${this.fieldId}"
            label="${this.label}"
            value="${ifDefined(this.value)}"
            ?hideLabel="${this.hideLabel}"
            ?isDisabled="${this.isDisabled}"
            ?isError="${this.isError}"
            placeholder="${ifDefined(this.placeholder)}"
            aria-expanded=${this.isActiveDropdown === true ? true : false}
            aria-autocomplete="list"
            aria-activedescendant="${this.ariaActiveDescendantId}"
            aria-controls=${this.ariaControlsId}
            role="combobox"
            @keydown=${this.handleKeyDown}
            @keyup=${this.handleKeyUp}
            @input=${(e: Event) => this.onChanged(e)}
            maxLength=${ifDefined(this.maxlength)}
            ?isActive="${this.isActive}"
          >
            <${this.iconSearchEl} slot="before" class="sl-c-search-form__icon-search"></${this.iconSearchEl}>
            ${
              this.value?.length
                ? html`
                  <${this.buttonEl} slot="after" @click=${this.clearSearchForm} class="sl-c-search-form__clear-button" ?hideText=${true} variant="tertiary">
                    ${this.clearButtonText}
                    <${this.iconCloseEl} slot="after"></${this.iconCloseEl}>
                  </${this.buttonEl}>
                `
                : html``
            }
          </${this.textFieldEl}>
          ${
            this.isEmpty && this.slotNotEmpty('emptyMessage')
              ? html`
                <${this.dropdownPanelEl} class="sl-c-search-form__dropdown-panel" @keydown=${this.handleKeyDown} ?hasScroll=${true}>
                  ${
                    this.slotNotEmpty('emptyMessage') &&
                    html`
                      <div class="sl-c-search-form__empty-message">
                        <slot name="emptyMessage"></slot>
                      </div>
                    `
                  }
                </${this.dropdownPanelEl}>
              `
              : this.isEmpty
                ? ''
                : html`
                <${this.dropdownPanelEl} class="sl-c-search-form__dropdown-panel" @keydown=${this.handleKeyDown} ?hasScroll=${true}>
                  <slot @select=${this.toggleActive}></slot>
                </${this.dropdownPanelEl}>
              `
          }
        </div>
        ${
          this.buttonText
            ? html`
              <${this.buttonEl} class="sl-c-search-form__submit-button" text=${this.buttonText} variant="primary" ?disabled="${this.isDisabled}">
                ${this.buttonText}
              </${this.buttonEl}>
            `
            : ''
        }
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

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLSearchForm.el) === undefined) {
  customElements.define(SLSearchForm.el, SLSearchForm);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-search-form': SLSearchForm;
  }
}
