import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import styles from './job-board.scss';
import '../../templates/dashboard/dashboard';
import '../../../components/badge/badge';
import '../../../components/button-group/button-group';
import '../../../components/button/button';
import '../../../components/card/card';
import '../../../components/checkbox-group/checkbox-group';
import '../../../components/checkbox/checkbox';
import '../../../components/chip-group/chip-group';
import '../../../components/chip/chip';
import '../../../components/dialog/dialog';
import '../../../components/divider/divider';
import '../../../components/heading/heading';
import '../../../components/icon/icons/filter';
import '../../../components/icon/icons/pin';
import '../../../components/icon/icons/star';
import '../../../components/input/input';
import '../../../components/link/link';
import '../../../components/pagination/pagination';
import '../../../components/radio-group/radio-group';
import '../../../components/radio/radio';
import '../../../components/range/range';
import '../../../components/search/search';
import '../../../components/select/select';
import '../../../components/text-passage/text-passage';

/**
 * Page: sl-l-job-board
 * @slot - The pages content
 */
export class SLJobBoard extends LitElement {
  static get styles() {
    return unsafeCSS(styles.toString());
  }

  @property()
  accessor styleModifier: string;

  @property()
  accessor filterStates = [
    'All locations', 'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  render() {
    const componentClassNames = classMap({
      'sl-l-job-board': true,
      [this.styleModifier]: !!this.styleModifier
    });

    return html`
      <sl-dashboard class=${componentClassNames}>
        <div class="sl-u-gap-xl">
          <sl-heading ?isBold=${true} variant="lg" tagName="h2">Job Board</sl-heading>
          <div class="sl-u-gap">
            <div class="sl-u-grid">
              <sl-search class="sl-u-grid__item col:12 col:12@lg col:6@xxl" label="Search by job title, company, keywords">
                <sl-list>
                  <sl-list-item>Senior Designer</sl-list-item>
                  <sl-list-item>Senior Developer</sl-list-item>
                  <sl-list-item>Core Designer</sl-list-item>
                  <sl-list-item>Core Developer</sl-list-item>
                </sl-list>
              </sl-search>
              <sl-select class="sl-u-grid__item col:12 col:6@lg col:3@xxl" label="Location">
                <sl-icon-pin slot="before"></sl-icon-pin>
                <sl-list>
                  ${this.filterStates.map(item => html`<sl-list-item>${item}</sl-list-item>`)}
                </sl-list>
              </sl-select>
              <sl-dialog class="sl-u-grid__item col:12 col:6@lg col:3@xxl" ?hasBackdrop=${true}>
                <sl-input label="Filters" ?isReadonly=${true} slot="trigger">
                  <sl-icon-filter slot="before"></sl-icon-filter>
                  <sl-badge slot="after">3</sl-badge>
                </sl-input>
                <sl-heading slot="header" ?isBold=${true} variant="md" tagName="h2">Filter</sl-heading>
                <div class="sl-l-job-board__filter-dialog sl-u-gap">
                  <sl-select label="Job Type" value="Full-time">
                    <sl-list>
                      <sl-list-item>All job types</sl-list-item>
                      <sl-list-item>Full-time</sl-list-item>
                      <sl-list-item>Part-time</sl-list-item>
                      <sl-list-item>Contract</sl-list-item>
                      <sl-list-item>Internship</sl-list-item>
                    </sl-list>
                  </sl-select>
                  <sl-divider></sl-divider>
                  <div class="sl-u-grid cols:6@md sl-u-grid--align-end">
                    <sl-checkbox-group label="Category">
                      <sl-checkbox>UX & UI Design</sl-checkbox>
                      <sl-checkbox>Print Design</sl-checkbox>
                      <sl-checkbox>Back-end Development</sl-checkbox>
                    </sl-checkbox-group>
                    <sl-checkbox-group label=" ">
                      <sl-checkbox ?isChecked=${true}>Front-end Development</sl-checkbox>
                      <sl-checkbox ?isChecked=${true}>Design Systems</sl-checkbox>
                      <sl-checkbox>Software Development</sl-checkbox>
                    </sl-checkbox-group>
                  </div>
                  <sl-divider></sl-divider>
                  <sl-radio-group label="Posted At">
                    <sl-radio>Any time</sl-radio>
                    <sl-radio>Last 24 hours</sl-radio>
                    <sl-radio>Last 3 days</sl-radio>
                    <sl-radio>Last 7 days</sl-radio>
                    <sl-radio>Last 14 days</sl-radio>
                    <sl-radio>Last 30 days</sl-radio>
                  </sl-radio-group>
                  <sl-divider></sl-divider>
                  <sl-select label="Location">
                    <sl-icon-pin slot="before"></sl-icon-pin>
                    <sl-list>
                      ${this.filterStates.map(item => html`<sl-list-item>${item}</sl-list-item>`)}
                    </sl-list>
                  </sl-select>
                  <sl-range label="Radius" behavior="range" max="1000" step="10"></sl-range>
                  <sl-divider></sl-divider>
                  <sl-checkbox>Only remote jobs</sl-checkbox>
                </div>
                <sl-button-group slot="footer">
                  <sl-button>Show Results</sl-button>
                  <sl-button variant="secondary">Reset</sl-button>
                </sl-button-group>
              </sl-dialog>
            </div>
            <sl-chip-group class="sl-u-gap">
              <sl-chip ?isDismissible=${true}>Front-end Development</sl-chip>
              <sl-chip ?isDismissible=${true}>Design Systems</sl-chip>
              <sl-chip ?isDismissible=${true}>Full-time</sl-chip>
            </sl-chip-group>
          </div>
          <sl-divider></sl-divider>
          <div class="sl-u-gap">
            <div class="sl-u-grid sl-u-grid--align-end">
              <sl-text-passage class="sl-u-grid__item col:12 col:5@md col:8@lg col:9@xl"><p>We've found <strong>32</strong> jobs!</p></sl-text-passage>
              <sl-select class="sl-u-grid__item col:12 col:7@md col:4@lg col:3@xl" label="Sort by">
                <sl-list>
                  <sl-list-item>Date</sl-list-item>
                  <sl-list-item>Title</sl-list-item>
                </sl-list>
              </sl-select>
            </div>
            <sl-card layout="inline">
              <div slot="image" class="sl-l-job-board__card-image">
                <sl-icon-star size="xl"></sl-icon-star>
              </div>
              <sl-heading variant="sm" tagName="h3"><a href="#">UX Designer</a></sl-heading>
              <div class="sl-u-gap-xs sl-u-gap--row"><sl-icon-pin></sl-icon-pin><p>New Orleans, LA</p></div>
              <div class="sl-u-gap-xs sl-u-gap--row">
                <sl-chip variant="secondary">Design</sl-chip>
                <sl-chip variant="secondary">Remote</sl-chip>
              </div>
              <sl-button slot="actions-start">Apply</sl-button>
              <div slot="actions-end" class="sl-u-theme-typography-body-xs">1 day ago</div>
            </sl-card>
            <sl-card layout="inline">
              <div slot="image" class="sl-l-job-board__card-image">
                <sl-icon-star size="xl"></sl-icon-star>
              </div>
              <sl-heading variant="sm" tagName="h3"><a href="#">Senior Front-end Developer</a></sl-heading>
              <div class="sl-u-gap-xs sl-u-gap--row"><sl-icon-pin></sl-icon-pin><p>New Orleans, LA</p></div>
              <div class="sl-u-gap-xs sl-u-gap--row">
                <sl-chip variant="secondary">Front-end Developer</sl-chip>
                <sl-chip variant="secondary">Design Systems</sl-chip>
              </div>
              <sl-button slot="actions-start">Apply</sl-button>
              <div slot="actions-end" class="sl-u-theme-typography-body-xs">1 day ago</div>
            </sl-card>
            <sl-card layout="inline">
              <div slot="image" class="sl-l-job-board__card-image">
                <sl-icon-star size="xl"></sl-icon-star>
              </div>
              <sl-heading variant="sm" tagName="h3"><a href="#">Junior Front-end Developer</a></sl-heading>
              <div class="sl-u-gap-xs sl-u-gap--row"><sl-icon-pin></sl-icon-pin><p>New Orleans, LA</p></div>
              <div class="sl-u-gap-xs sl-u-gap--row">
                <sl-chip variant="secondary">Front-end Developer</sl-chip>
                <sl-chip variant="secondary">Design Systems</sl-chip>
                <sl-chip variant="secondary">Remote</sl-chip>
              </div>
              <sl-button slot="actions-start">Apply</sl-button>
              <div slot="actions-end" class="sl-u-theme-typography-body-xs">1 day ago</div>
            </sl-card>
            <sl-card layout="inline">
              <div slot="image" class="sl-l-job-board__card-image">
                <sl-icon-star size="xl"></sl-icon-star>
              </div>
              <sl-heading variant="sm" tagName="h3"><a href="#">Back-end Developer</a></sl-heading>
              <div class="sl-u-gap-xs sl-u-gap--row"><sl-icon-pin></sl-icon-pin><p>New Orleans, LA</p></div>
              <div class="sl-u-gap-xs sl-u-gap--row">
                <sl-chip variant="secondary">Software</sl-chip>
                <sl-chip variant="secondary">API</sl-chip>
              </div>
              <sl-button slot="actions-start">Apply</sl-button>
              <div slot="actions-end" class="sl-u-theme-typography-body-xs">2 days ago</div>
            </sl-card>
            <sl-card layout="inline">
              <div slot="image" class="sl-l-job-board__card-image">
                <sl-icon-star size="xl"></sl-icon-star>
              </div>
              <sl-heading variant="sm" tagName="h3"><a href="#">UX Designer</a></sl-heading>
              <div class="sl-u-gap-xs sl-u-gap--row"><sl-icon-pin></sl-icon-pin><p>New Orleans, LA</p></div>
              <div class="sl-u-gap-xs sl-u-gap--row">
                <sl-chip variant="secondary">Design</sl-chip>
                <sl-chip variant="secondary">Remote</sl-chip>
              </div>
              <sl-button slot="actions-start">Apply</sl-button>
              <div slot="actions-end" class="sl-u-theme-typography-body-xs">2 days ago</div>
            </sl-card>
            <sl-card layout="inline">
              <div slot="image" class="sl-l-job-board__card-image">
                <sl-icon-star size="xl"></sl-icon-star>
              </div>
              <sl-heading variant="sm" tagName="h3"><a href="#">Senior Front-end Developer</a></sl-heading>
              <div class="sl-u-gap-xs sl-u-gap--row"><sl-icon-pin></sl-icon-pin><p>New Orleans, LA</p></div>
              <div class="sl-u-gap-xs sl-u-gap--row">
                <sl-chip variant="secondary">Front-end Developer</sl-chip>
                <sl-chip variant="secondary">Design Systems</sl-chip>
              </div>
              <sl-button slot="actions-start">Apply</sl-button>
              <div slot="actions-end" class="sl-u-theme-typography-body-xs">3 days ago</div>
            </sl-card>
            <sl-card layout="inline">
              <div slot="image" class="sl-l-job-board__card-image">
                <sl-icon-star size="xl"></sl-icon-star>
              </div>
              <sl-heading variant="sm" tagName="h3"><a href="#">Junior Front-end Developer</a></sl-heading>
              <div class="sl-u-gap-xs sl-u-gap--row"><sl-icon-pin></sl-icon-pin><p>New Orleans, LA</p></div>
              <div class="sl-u-gap-xs sl-u-gap--row">
                <sl-chip variant="secondary">Front-end Developer</sl-chip>
                <sl-chip variant="secondary">Design Systems</sl-chip>
                <sl-chip variant="secondary">Remote</sl-chip>
              </div>
              <sl-button slot="actions-start">Apply</sl-button>
              <div slot="actions-end" class="sl-u-theme-typography-body-xs">3 days ago</div>
            </sl-card>
            <sl-card layout="inline">
              <div slot="image" class="sl-l-job-board__card-image">
                <sl-icon-star size="xl"></sl-icon-star>
              </div>
              <sl-heading variant="sm" tagName="h3"><a href="#">Back-end Developer</a></sl-heading>
              <div class="sl-u-gap-xs sl-u-gap--row"><sl-icon-pin></sl-icon-pin><p>New Orleans, LA</p></div>
              <div class="sl-u-gap-xs sl-u-gap--row">
                <sl-chip variant="secondary">Software</sl-chip>
                <sl-chip variant="secondary">API</sl-chip>
              </div>
              <sl-button slot="actions-start">Apply</sl-button>
              <div slot="actions-end" class="sl-u-theme-typography-body-xs">3 days ago</div>
            </sl-card>
            <sl-card layout="inline">
              <div slot="image" class="sl-l-job-board__card-image">
                <sl-icon-star size="xl"></sl-icon-star>
              </div>
              <sl-heading variant="sm" tagName="h3"><a href="#">UX Designer</a></sl-heading>
              <div class="sl-u-gap-xs sl-u-gap--row"><sl-icon-pin></sl-icon-pin><p>New Orleans, LA</p></div>
              <div class="sl-u-gap-xs sl-u-gap--row">
                <sl-chip variant="secondary">Design</sl-chip>
                <sl-chip variant="secondary">Remote</sl-chip>
              </div>
              <sl-button slot="actions-start">Apply</sl-button>
              <div slot="actions-end" class="sl-u-theme-typography-body-xs">4 days ago</div>
            </sl-card>
            <sl-card layout="inline">
              <div slot="image" class="sl-l-job-board__card-image">
                <sl-icon-star size="xl"></sl-icon-star>
              </div>
              <sl-heading variant="sm" tagName="h3"><a href="#">Senior Front-end Developer</a></sl-heading>
              <div class="sl-u-gap-xs sl-u-gap--row"><sl-icon-pin></sl-icon-pin><p>New Orleans, LA</p></div>
              <div class="sl-u-gap-xs sl-u-gap--row">
                <sl-chip variant="secondary">Front-end Developer</sl-chip>
                <sl-chip variant="secondary">Design Systems</sl-chip>
              </div>
              <sl-button slot="actions-start">Apply</sl-button>
              <div slot="actions-end" class="sl-u-theme-typography-body-xs">4 days ago</div>
            </sl-card>
          </div>
          <sl-pagination totalRecords="32"></sl-pagination>
        </div>
      </sl-dashboard>
    `;
  }
}

if (customElements.get('sl-job-board') === undefined) {
  customElements.define('sl-job-board', SLJobBoard);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-job-board': SLJobBoard;
  }
}
