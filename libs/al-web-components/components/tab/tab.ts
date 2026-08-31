import { TemplateResult, unsafeCSS, html } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ALElement } from '../ALElement';
import styles from './tab.scss';

/**
 * Component: al-tab
 * @slot - The tab label
 *
 * @event onTabSelect - Fired when this tab is selected. Detail: `{ value, index }` — the tab element itself and its index.
 */
export class ALTab extends ALElement {
  static el = 'al-tab';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Active state
   * - **true** Renders a tab with selected/active state
   * - **false** Renders a tab without selected/active state
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Disabled attribute
   * - **true** Renders a tab with the disabled property and state
   * - **false** Renders a tab without the disabled property and state
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * ID used to connect the tab panel to the tab aria-controls
   */
  @property()
  accessor ariaId: string;

  /**
   * Aria controls attribute
   * - Set by `<al-tabs>` to the id of the matching `<al-tab-panel>`
   * - **Not rendered as an attribute.** The panel's id lives inside
   *   `<al-tab-panel>`'s shadow root while this tab's `<button>` lives inside
   *   `<al-tab>`'s, and an IDREF cannot cross a shadow boundary — axe reported
   *   every value as `aria-valid-attr-value`. `aria-controls` is a SHOULD for
   *   `role="tab"`, not a MUST; the selected state still comes through
   *   `aria-selected`.
   */
  @property()
  accessor ariaControls: string;

  /**
   * Index to track tab
   */
  @property({ type: Number })
  accessor idx: number = 0;

  /**
   * A11y — the role rendered on the internal `<button>`.
   *
   * `tab` requires a `tablist` owner, and `<al-tabs>` renders that
   * `<div role="tablist">` in *its* shadow root. Rendered standalone (the
   * "Atoms/Navigation/Tab" stories) a hardcoded `role="tab"` has no required
   * parent and axe reports `aria-required-parent`. Falling back to the
   * `<button>`'s implicit `button` role is both valid and honest.
   */
  @state()
  accessor _tabRole: 'tab' | undefined = undefined;

  /**
   * A11y — recompute the role from the flattened tree. Also runs once on the
   * next frame, because `<al-tabs>` may not have rendered its tablist yet when
   * this tab first updates.
   */
  private syncTabRole() {
    this._tabRole = this.hasAncestorRole(['tablist']) ? 'tab' : undefined;
  }

  async firstUpdated() {
    await this.updateComplete;
    requestAnimationFrame(() => this.syncTabRole());
  }

  updated() {
    this.syncTabRole();
  }

  /**
   * Handle on click
   * 1. Dispatch a custom event on click of the tab
   */
  handleOnClick() {
    this.dispatch({
      eventName: 'onTabSelect',
      detailObj: {
        value: this,
        index: this.idx
      }
    });
  }

  /**
   * Query the tab element inside the ALTab
   */
  @query('.al-c-tab')
  accessor tabEl: HTMLButtonElement;

  render() {
    const componentClassNames = this.componentClassNames('al-c-tab', {
      'al-is-active': this.isActive,
      'al-is-disabled': this.isDisabled
    });

    return html`
      <button
        class="${componentClassNames}"
        role=${ifDefined(this._tabRole)}
        @click=${this.handleOnClick}
        ?disabled=${this.isDisabled}
        tabindex=${this.isActive ? '0' : '-1'}
        id=${ifDefined(this.ariaId)}
        aria-selected=${ifDefined(this._tabRole ? String(!!this.isActive) : undefined)}
      >
        <slot></slot>
      </button>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALTab.el) === undefined) {
  customElements.define(ALTab.el, ALTab);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-tab': ALTab;
  }
}
