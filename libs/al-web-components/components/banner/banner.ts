import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALIconSuccess } from '../icon/icons/success';
import { ALIconInfo } from '../icon/icons/info';
import { ALIconWarningCircle } from '../icon/icons/warning-circle';
import { ALIconWarningTriangle } from '../icon/icons/warning-triangle';
import { ALIconChevronDown } from '../icon/icons/chevron-down';
import { ALIconChevronUp } from '../icon/icons/chevron-up';
import { ALButton } from '../button/button';
import styles from './banner.scss';

/**
 * Component: al-banner
 * - **slot**: The banner's description content
 * - **slot** "icon": Slot in an icon to override the default one
 * - **slot** "actions": Slot for action buttons or links
 */
export class ALBanner extends ALElement {
  static el = 'al-banner';

  private elementMap = register({
    elements: [
      [ALIconSuccess.el, ALIconSuccess],
      [ALIconInfo.el, ALIconInfo],
      [ALIconWarningCircle.el, ALIconWarningCircle],
      [ALIconWarningTriangle.el, ALIconWarningTriangle],
      [ALIconChevronDown.el, ALIconChevronDown],
      [ALIconChevronUp.el, ALIconChevronUp],
      [ALButton.el, ALButton]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private iconSuccessEl = unsafeStatic(this.elementMap.get(ALIconSuccess.el));
  private iconInfoEl = unsafeStatic(this.elementMap.get(ALIconInfo.el));
  private iconWarningCircleEl = unsafeStatic(this.elementMap.get(ALIconWarningCircle.el));
  private iconWarningTriangleEl = unsafeStatic(this.elementMap.get(ALIconWarningTriangle.el));
  private iconChevronDownEl = unsafeStatic(this.elementMap.get(ALIconChevronDown.el));
  private iconChevronUpEl = unsafeStatic(this.elementMap.get(ALIconChevronUp.el));
  private buttonEl = unsafeStatic(this.elementMap.get(ALButton.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variants
   * - **info** renders a banner that represents an informative state (default)
   * - **success** renders a banner that represents a success state
   * - **warning** renders a banner that represents a warning state
   * - **danger** renders a banner that represents a danger state
   */
  @property()
  accessor variant: 'info' | 'success' | 'warning' | 'danger' = 'info';

  /**
   * Title of the banner
   */
  @property()
  accessor title: string = 'Banner Title';

  /**
   * Description text of the banner
   */
  @property()
  accessor description: string;

  /**
   * Expanded state
   * - If true, the banner shows description and actions
   * - If false, the banner only shows the title
   */
  @property({ type: Boolean })
  accessor isExpanded: boolean = false;

  /**
   * Collapsible state
   * - If true, the banner can be expanded/collapsed
   * - If false, the expand/collapse button is hidden
   */
  @property({ type: Boolean })
  accessor isCollapsible: boolean = true;

  /**
   * Show description
   * - If true, the description is shown when expanded
   * - If false, the description is hidden even when expanded
   */
  @property({ type: Boolean })
  accessor showDescription: boolean = true;

  /**
   * Toggle expanded state
   */
  public toggleExpanded() {
    this.isExpanded = !this.isExpanded;
    
    this.dispatch({
      eventName: this.isExpanded ? 'expand' : 'collapse',
      detailObj: {
        expanded: this.isExpanded
      }
    });
  }

  /**
   * Expand the banner
   */
  public expand() {
    if (!this.isExpanded) {
      this.isExpanded = true;
      this.dispatch({
        eventName: 'expand',
        detailObj: {
          expanded: this.isExpanded
        }
      });
    }
  }

  /**
   * Collapse the banner
   */
  public collapse() {
    if (this.isExpanded) {
      this.isExpanded = false;
      this.dispatch({
        eventName: 'collapse',
        detailObj: {
          expanded: this.isExpanded
        }
      });
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-banner', {
      'al-c-banner--info': this.variant === 'info',
      'al-c-banner--success': this.variant === 'success',
      'al-c-banner--warning': this.variant === 'warning',
      'al-c-banner--danger': this.variant === 'danger',
      'al-c-banner--expanded': this.isExpanded,
      'al-c-banner--collapsed': !this.isExpanded
    });

    let bannerIcon = html`<${this.iconInfoEl}></${this.iconInfoEl}>`;

    if (this.variant === 'success') {
      bannerIcon = html`<${this.iconSuccessEl}></${this.iconSuccessEl}>`;
    } else if (this.variant === 'warning') {
      bannerIcon = html`<${this.iconWarningTriangleEl}></${this.iconWarningTriangleEl}>`;
    } else if (this.variant === 'danger') {
      bannerIcon = html`<${this.iconWarningCircleEl}></${this.iconWarningCircleEl}>`;
    }

    const chevronIcon = this.isExpanded 
      ? html`<${this.iconChevronUpEl}></${this.iconChevronUpEl}>`
      : html`<${this.iconChevronDownEl}></${this.iconChevronDownEl}>`;

    return html`
      <div
        role="region"
        aria-expanded="${this.isCollapsible ? this.isExpanded : undefined}"
        class=${componentClassNames}
      >
        <div class="al-c-banner__main">
          <div class="al-c-banner__icon">
            ${this.slotNotEmpty('icon') 
              ? html`<slot name="icon"></slot>` 
              : bannerIcon}
          </div>
          <div class="al-c-banner__content">
            <div class="al-c-banner__title">${this.title}</div>
            ${this.isExpanded ? html`
              <div class="al-c-banner__body">
                ${this.showDescription && (this.description || this.slotNotEmpty('')) ? html`
                  <div class="al-c-banner__description">
                    ${this.description || html`<slot></slot>`}
                  </div>
                ` : ''}
                ${this.slotNotEmpty('actions') ? html`
                  <div class="al-c-banner__actions">
                    <slot name="actions"></slot>
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>
        </div>
        ${this.isCollapsible ? html`
          <div class="al-c-banner__toggle">
            <${this.buttonEl} 
              class="al-c-banner__toggle-button" 
              variant="bare" 
              hideText="true" 
              label="${this.isExpanded ? 'Collapse' : 'Expand'}"
              isExpanded="${this.isExpanded}"
              @click=${this.toggleExpanded}
            >
              ${chevronIcon}
            </${this.buttonEl}>
          </div>
        ` : ''}
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALBanner.el) === undefined) {
  customElements.define(ALBanner.el, ALBanner);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-banner': ALBanner;
  }
}