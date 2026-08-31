/* eslint-disable lit-a11y/click-events-have-key-events --
 * The `role="option"` rows carry `@click` and no keydown, and correctly so:
 * this is the aria-activedescendant pattern. The options are NEVER focused —
 * focus stays in the combobox input, which owns the whole keyboard contract
 * (ArrowUp/ArrowDown/Home/End move `activeIndex`, Enter calls
 * `chooseAction(results[this.activeIndex])`). A keydown handler on an element
 * that can never receive focus would be dead code, and adding tabindex to the
 * options would BREAK the pattern by moving focus out of the input.
 */
import { TemplateResult, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import { magnifyingGlass } from '../icon/glyphs';
import { registerIcons } from '../icon/registry';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALFocusTrap } from '../focus-trap/focus-trap';
import { ALIcon } from '../icon/icon';
import { ALCommandAction, fuzzySearchActions } from './command-palette.model';
import styles from './command-palette.scss';

registerIcons({ 'magnifying-glass': magnifyingGlass });

/**
 * Component: al-command-palette
 *
 * A cmd/ctrl+k overlay with fuzzy search over a provided action list.
 * Reuses `al-focus-trap` for the same focus-containment behavior as
 * `al-dialog`/`al-popover`, and the same "always-rendered, opacity/visibility
 * toggled" overlay shape as `al-dialog` for its backdrop + transition.
 *
 * The `actions` array is the entire action-provider API: `{ id, label, group?,
 * keywords?, icon? }`. `icon` names must already be registered (see the icon
 * system section of AGENTS.md) — the palette does not register glyphs on your behalf.
 *
 * @slot - Optional content rendered above the results list (e.g. recent-searches).
 *
 * @event onCommandPaletteOpen - Fired when the palette opens. Detail: `{ active }` — always `true`.
 * @event onCommandPaletteClose - Fired when the palette closes by any means (Escape, backdrop click, or an action being chosen). Detail: `{ active }` — always `false`.
 * @event onCommandPaletteAction - Fired when an action is chosen (click or Enter). Detail: `{ action }` — the selected `ALCommandAction`.
 */
export class ALCommandPalette extends ALElement {
  static el = 'al-command-palette';

  private elementMap = register({
    elements: [
      [ALFocusTrap.el, ALFocusTrap],
      [ALIcon.el, ALIcon]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private focusTrapEl = unsafeStatic(this.elementMap.get(ALFocusTrap.el));
  private iconEl = unsafeStatic(this.elementMap.get(ALIcon.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * The action list to search over. The entire action-provider API.
   */
  /**
   * Settable as a JSON attribute as well as a property, so the palette can be
   * driven from static HTML and SSR — not only from JavaScript.
   */
  @property({ type: Array })
  accessor actions: Array<ALCommandAction> = [];

  /**
   * Is the palette open?
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Opt-in: when true, a document-level Cmd/Ctrl+K listener toggles the palette open.
   */
  @property({ type: Boolean })
  accessor enableShortcut: boolean;

  /**
   * Input placeholder text.
   */
  @property()
  accessor placeholder: string = 'Type a command or search…';

  /**
   * Text shown when no action matches the query.
   */
  @property()
  accessor emptyText: string = 'No matching commands';

  /**
   * Accessible label for the dialog surface.
   */
  @property()
  accessor ariaLabel: string = 'Command palette';

  /**
   * Accessible name for the search input.
   *
   * NOT the placeholder. A placeholder is not an accessible name — it is
   * removed from the accessibility tree the moment the user types, so the field
   * a screen-reader user is mid-way through becomes an unnamed combobox. The
   * two are set separately for that reason.
   */
  @property()
  accessor searchLabel: string = 'Search commands';

  /**
   * Number of ms of the palette's open/close CSS transition delay, used to delay
   * focus trap activation. Mirrors al-dialog's `transitionDelay`.
   */
  @property({ type: Number })
  accessor transitionDelay: number = 200;

  /**
   * The current search query.
   */
  @state()
  private accessor query: string = '';

  /**
   * Index of the keyboard-highlighted result, or `-1` when none.
   */
  @state()
  private accessor activeIndex: number = -1;

  private listboxId = nanoid();

  private get results(): Array<ALCommandAction> {
    return fuzzySearchActions(this.actions ?? [], this.query);
  }

  constructor() {
    super();
    this.handleGlobalShortcut = this.handleGlobalShortcut.bind(this);
    this.handleOnClickOutside = this.handleOnClickOutside.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    globalThis.addEventListener('mousedown', this.handleOnClickOutside, false);
    if (this.enableShortcut) {
      document.addEventListener('keydown', this.handleGlobalShortcut, false);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    globalThis.removeEventListener('mousedown', this.handleOnClickOutside, false);
    document.removeEventListener('keydown', this.handleGlobalShortcut, false);
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('enableShortcut')) {
      document.removeEventListener('keydown', this.handleGlobalShortcut, false);
      if (this.enableShortcut) {
        document.addEventListener('keydown', this.handleGlobalShortcut, false);
      }
    }
    if (changedProperties.has('isActive')) {
      this.setBodyOverflow();
      if (this.isActive) {
        // Focus the search field once the open transition has had time to run.
        setTimeout(() => {
          this.shadowRoot?.querySelector<HTMLInputElement>('.al-c-command-palette__input')?.focus();
        }, this.transitionDelay);
      }
    }
  }

  /**
   * Prevent the page from scrolling behind the overlay while it's open,
   * mirroring al-dialog's setBodyOverflow.
   */
  private setBodyOverflow() {
    const body = document.querySelector('body');
    if (this.isActive) {
      body.style.overflow = 'hidden';
    } else {
      body.style.removeProperty('overflow');
    }
  }

  /**
   * Document-level Cmd/Ctrl+K listener, opt-in via `enableShortcut`.
   */
  private handleGlobalShortcut(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.toggle();
    }
  }

  private handleOnClickOutside(e: MouseEvent) {
    if (!this.isActive) {
      return;
    }
    const didClickInside = e.composedPath().includes(this.shadowRoot?.host as EventTarget);
    if (!didClickInside) {
      this.close();
    }
  }

  public toggle() {
    if (this.isActive) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * The element that had focus when the palette opened, so close() can put it
   * back (WCAG 2.4.3). The palette is opened from anywhere by a shortcut, so
   * there is no "trigger" element to fall back to.
   */
  private previouslyFocused: HTMLElement | null = null;

  private getActiveElement(): HTMLElement | null {
    let active = document.activeElement as HTMLElement | null;
    while (active?.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement as HTMLElement;
    }
    return active;
  }

  public open() {
    this.previouslyFocused = this.getActiveElement();
    this.isActive = true;
    this.query = '';
    this.activeIndex = -1;
    this.setOutsideInert(true);
    this.dispatch({ eventName: 'onCommandPaletteOpen', detailObj: { active: true } });
  }

  public close() {
    this.isActive = false;
    this.setOutsideInert(false);
    /* Focus went into the palette's own input; hand it back to whatever the
       user was on before, or it lands on <body>. */
    const restoreTo = this.previouslyFocused;
    this.previouslyFocused = null;
    if (restoreTo && typeof restoreTo.focus === 'function' && restoreTo.isConnected) {
      setTimeout(() => restoreTo.focus(), 1);
    }
    this.dispatch({ eventName: 'onCommandPaletteClose', detailObj: { active: false } });
  }

  private handleInput(e: Event) {
    this.query = (e.target as HTMLInputElement).value;
    this.activeIndex = this.results.length ? 0 : -1;
  }

  private chooseAction(action: ALCommandAction | undefined) {
    if (!action) {
      return;
    }
    this.dispatch({ eventName: 'onCommandPaletteAction', detailObj: { action } });
    this.close();
  }

  private handleKeyDown(e: KeyboardEvent) {
    const results = this.results;

    switch (e.code) {
      case 'ArrowDown':
        e.preventDefault();
        if (results.length) {
          this.activeIndex = (this.activeIndex + 1 + results.length) % results.length;
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (results.length) {
          this.activeIndex = (this.activeIndex - 1 + results.length) % results.length;
        }
        break;
      case 'Home':
        if (results.length) {
          e.preventDefault();
          this.activeIndex = 0;
        }
        break;
      case 'End':
        if (results.length) {
          e.preventDefault();
          this.activeIndex = results.length - 1;
        }
        break;
      case 'Enter':
        e.preventDefault();
        this.chooseAction(results[this.activeIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      default:
        break;
    }
  }

  private optionId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }

  /**
   * A11y note for `render()`: when there are no results the `<ul
   * role="listbox">` is not rendered at all. An empty listbox has no `option`
   * children (axe `aria-required-children`) and the "no matches" message used
   * to be an `<li>` whose only list context was that listbox (axe `listitem`).
   * With nothing to choose from there is no listbox — just a status message.
   */
  private renderResults() {
    const results = this.results;

    let lastGroup: string | undefined;

    return results.map((action, index) => {
      const showGroupHeading = action.group !== lastGroup;
      lastGroup = action.group;

      return html`
        ${showGroupHeading && action.group ? html`<li role="presentation" class="al-c-command-palette__group">${action.group}</li>` : ''}
        <li
          id=${this.optionId(index)}
          role="option"
          aria-selected=${index === this.activeIndex}
          class=${classMap({ 'al-c-command-palette__option': true, 'al-is-active': index === this.activeIndex })}
          @mouseenter=${() => (this.activeIndex = index)}
          @click=${() => this.chooseAction(action)}
        >
          ${action.icon ? html`<${this.iconEl} name=${action.icon} class="al-c-command-palette__option-icon"></${this.iconEl}>` : ''}
          <span class="al-c-command-palette__option-label">${action.label}</span>
        </li>
      `;
    });
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-command-palette', {
      'al-is-active': this.isActive === true
    });

    const activeId = this.activeIndex > -1 ? this.optionId(this.activeIndex) : undefined;

    return html`
      <div class="${componentClassNames}">
        <${this.focusTrapEl} .transitionDelay=${this.transitionDelay} ?isActive=${this.isActive}>
          <div class="al-c-command-palette__container" role="dialog" aria-modal="true" aria-label=${this.ariaLabel}>
            <div class="al-c-command-palette__search">
              <${this.iconEl} name="magnifying-glass" class="al-c-command-palette__search-icon"></${this.iconEl}>
              <input
                class="al-c-command-palette__input"
                type="text"
                role="combobox"
                aria-label=${this.searchLabel}
                aria-expanded="true"
                aria-controls=${this.listboxId}
                aria-autocomplete="list"
                aria-activedescendant=${ifDefined(activeId)}
                placeholder=${this.placeholder}
                .value=${this.query}
                @input=${this.handleInput}
                @keydown=${this.handleKeyDown}
              />
            </div>
            <slot></slot>
            ${this.results.length
              ? html`
                  <ul class="al-c-command-palette__list" role="listbox" id=${this.listboxId} aria-label="Commands">
                    ${this.renderResults()}
                  </ul>
                `
              : html`
                  <div class="al-c-command-palette__list al-c-command-palette__empty" id=${this.listboxId} role="status">
                    ${this.emptyText}
                  </div>
                `}
            <div class="al-c-command-palette__footer">
              <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> to navigate</span>
              <span><kbd>&crarr;</kbd> to select</span>
              <span><kbd>Esc</kbd> to close</span>
            </div>
          </div>
        </${this.focusTrapEl}>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALCommandPalette.el) === undefined) {
  customElements.define(ALCommandPalette.el, ALCommandPalette);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-command-palette': ALCommandPalette;
  }
}
