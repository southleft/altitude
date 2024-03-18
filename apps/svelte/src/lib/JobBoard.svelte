<script>
  import 'al-web-components/dist/components/badge/badge';
  import 'al-web-components/dist/components/button-group/button-group';
  import 'al-web-components/dist/components/button/button';
  import 'al-web-components/dist/components/card/card';
  import 'al-web-components/dist/components/checkbox-group/checkbox-group';
  import 'al-web-components/dist/components/checkbox/checkbox';
  import 'al-web-components/dist/components/chip-group/chip-group';
  import 'al-web-components/dist/components/chip/chip';
  import 'al-web-components/dist/components/dialog/dialog';
  import 'al-web-components/dist/components/divider/divider';
  import 'al-web-components/dist/components/header/header';
  import 'al-web-components/dist/components/heading/heading';
  import 'al-web-components/dist/components/icon/icons/filter';
  import 'al-web-components/dist/components/icon/icons/pin';
  import 'al-web-components/dist/components/icon/icons/star';
  import 'al-web-components/dist/components/input/input';
  import 'al-web-components/dist/components/list-item/list-item';
  import 'al-web-components/dist/components/list/list';
  import 'al-web-components/dist/components/radio-group/radio-group';
  import 'al-web-components/dist/components/radio/radio';
  import 'al-web-components/dist/components/range/range';
  import 'al-web-components/dist/components/search/search';
  import 'al-web-components/dist/components/select/select';
  import 'al-web-components/dist/components/text-passage/text-passage';
  import 'al-web-components/dist/components/pagination/pagination';
  import './JobBoard.css';
  import { Link } from 'svelte-routing'

  export const filterStates  = [
    'All locations', 'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];
</script>

<div class="al-u-gap-xl">
  <al-heading isBold={true} variant="lg" tagName="h2">Job Board</al-heading>
  <div class="al-u-gap">
    <div class="al-u-grid">
      <al-search class="al-u-grid__item col:12 col:12@lg col:6@xxl" label="Search by job title, company, keywords">
        <al-list>
          <al-list-item>Senior Designer</al-list-item>
          <al-list-item>Senior Developer</al-list-item>
          <al-list-item>Core Designer</al-list-item>
          <al-list-item>Core Developer</al-list-item>
        </al-list>
      </al-search>
      <al-select class="al-u-grid__item col:12 col:6@lg col:3@xxl" label="Location">
        <al-icon-pin slot="before"></al-icon-pin>
        {#each filterStates as item}
          <al-list>
            <al-list-item>{item}</al-list-item>
          </al-list>
        {/each}
      </al-select>
      <al-dialog class="al-u-grid__item col:12 col:6@lg col:3@xxl" hasBackdrop={true}>
        <al-input label="Filters" isReadonly={true} slot="trigger">
          <al-icon-filter slot="before"></al-icon-filter>
          <al-badge slot="after">3</al-badge>
        </al-input>
        <al-heading slot="header" isBold={true} variant="md" tagName="h2">
          Filter
        </al-heading>
        <div class="al-l-job-board__filter-dialog al-u-gap">
          <al-select label="Job Type" value="Full-time">
            <al-list>
              <al-list-item>All job types</al-list-item>
              <al-list-item>Full-time</al-list-item>
              <al-list-item>Part-time</al-list-item>
              <al-list-item>Contract</al-list-item>
              <al-list-item>Internship</al-list-item>
            </al-list>
          </al-select>
          <al-divider></al-divider>
          <div class="al-u-grid cols:6@md al-u-grid--align-end">
            <al-checkbox-group label="Category">
              <al-checkbox>UX & UI Design</al-checkbox>
              <al-checkbox>Print Design</al-checkbox>
              <al-checkbox>Back-end Development</al-checkbox>
            </al-checkbox-group>
            <al-checkbox-group label=" ">
              <al-checkbox isChecked={true}>Front-end Development</al-checkbox>
              <al-checkbox isChecked={true}>Design Systems</al-checkbox>
              <al-checkbox>Software Development</al-checkbox>
            </al-checkbox-group>
          </div>
          <al-divider></al-divider>
          <al-radio-group label="Posted At">
            <al-radio>Any time</al-radio>
            <al-radio>Last 24 hours</al-radio>
            <al-radio>Last 3 days</al-radio>
            <al-radio>Last 7 days</al-radio>
            <al-radio>Last 14 days</al-radio>
            <al-radio>Last 30 days</al-radio>
          </al-radio-group>
          <al-divider></al-divider>
          <al-select label="Location">
            <al-icon-pin slot="before"></al-icon-pin>
            {#each filterStates as item}
              <al-list>
                <al-list-item>{item}</al-list-item>
              </al-list>
            {/each}
          </al-select>
          <al-range label="Radius" behavior="range" max="1000" step="10"></al-range>
          <al-divider></al-divider>
          <al-checkbox>Only remote jobs</al-checkbox>
        </div>
        <al-button-group slot="footer">
          <al-button>Show Results</al-button>
          <al-button variant="secondary">Reset</al-button>
        </al-button-group>
      </al-dialog>
    </div>
    <al-chip-group class="al-u-gap">
      <al-chip isDismissible={true}>Front-end Development</al-chip>
      <al-chip isDismissible={true}>Design Systems</al-chip>
      <al-chip isDismissible={true}>Full-time</al-chip>
    </al-chip-group>
  </div>
  <al-divider></al-divider>
  <div class="al-u-gap">
    <div class="al-u-grid al-u-grid--align-end">
      <al-text-passage class="al-u-grid__item col:12 col:5@md col:8@lg col:9@xl"><p>We've found <strong>32</strong> jobs!</p></al-text-passage>
      <al-select class="al-u-grid__item col:12 col:7@md col:4@lg col:3@xl" label="Sort by">
        <al-list>
          <al-list-item>Date</al-list-item>
          <al-list-item>Title</al-list-item>
        </al-list>
      </al-select>
    </div>
    <al-card layout="inline">
      <div slot="image" class="al-l-job-board__card-image">
        <al-icon-star size="xl"></al-icon-star>
      </div>
      <al-heading variant="sm" tagName="h3"><Link to="#">UX Designer</Link></al-heading>
      <div class="al-u-gap-xs al-u-gap--row"><al-icon-pin></al-icon-pin><p>New Orleans, LA</p></div>
      <div class="al-u-gap-xs al-u-gap--row">
        <al-chip variant="secondary">Design</al-chip>
        <al-chip variant="secondary">Remote</al-chip>
      </div>
      <al-button slot="actions-start">Apply</al-button>
      <div slot="actions-end" class="al-u-theme-typography-body-xs">1 day ago</div>
    </al-card>
    <al-card layout="inline">
      <div slot="image" class="al-l-job-board__card-image">
        <al-icon-star size="xl"></al-icon-star>
      </div>
      <al-heading variant="sm" tagName="h3"><Link to="#">Senior Front-end Developer</Link></al-heading>
      <div class="al-u-gap-xs al-u-gap--row"><al-icon-pin></al-icon-pin><p>New Orleans, LA</p></div>
      <div class="al-u-gap-xs al-u-gap--row">
        <al-chip variant="secondary">Front-end Developer</al-chip>
        <al-chip variant="secondary">Design Systems</al-chip>
      </div>
      <al-button slot="actions-start">Apply</al-button>
      <div slot="actions-end" class="al-u-theme-typography-body-xs">1 day ago</div>
    </al-card>
    <al-card layout="inline">
      <div slot="image" class="al-l-job-board__card-image">
        <al-icon-star size="xl"></al-icon-star>
      </div>
      <al-heading variant="sm" tagName="h3"><Link to="#">Junior Front-end Developer</Link></al-heading>
      <div class="al-u-gap-xs al-u-gap--row"><al-icon-pin></al-icon-pin><p>New Orleans, LA</p></div>
      <div class="al-u-gap-xs al-u-gap--row">
        <al-chip variant="secondary">Front-end Developer</al-chip>
        <al-chip variant="secondary">Design Systems</al-chip>
        <al-chip variant="secondary">Remote</al-chip>
      </div>
      <al-button slot="actions-start">Apply</al-button>
      <div slot="actions-end" class="al-u-theme-typography-body-xs">1 day ago</div>
    </al-card>
    <al-card layout="inline">
      <div slot="image" class="al-l-job-board__card-image">
        <al-icon-star size="xl"></al-icon-star>
      </div>
      <al-heading variant="sm" tagName="h3"><Link to="#">Back-end Developer</Link></al-heading>
      <div class="al-u-gap-xs al-u-gap--row"><al-icon-pin></al-icon-pin><p>New Orleans, LA</p></div>
      <div class="al-u-gap-xs al-u-gap--row">
        <al-chip variant="secondary">Software</al-chip>
        <al-chip variant="secondary">API</al-chip>
      </div>
      <al-button slot="actions-start">Apply</al-button>
      <div slot="actions-end" class="al-u-theme-typography-body-xs">2 days ago</div>
    </al-card>
    <al-card layout="inline">
      <div slot="image" class="al-l-job-board__card-image">
        <al-icon-star size="xl"></al-icon-star>
      </div>
      <al-heading variant="sm" tagName="h3"><Link to="#">UX Designer</Link></al-heading>
      <div class="al-u-gap-xs al-u-gap--row"><al-icon-pin></al-icon-pin><p>New Orleans, LA</p></div>
      <div class="al-u-gap-xs al-u-gap--row">
        <al-chip variant="secondary">Design</al-chip>
        <al-chip variant="secondary">Remote</al-chip>
      </div>
      <al-button slot="actions-start">Apply</al-button>
      <div slot="actions-end" class="al-u-theme-typography-body-xs">2 days ago</div>
    </al-card>
    <al-card layout="inline">
      <div slot="image" class="al-l-job-board__card-image">
        <al-icon-star size="xl"></al-icon-star>
      </div>
      <al-heading variant="sm" tagName="h3"><Link to="#">Senior Front-end Developer</Link></al-heading>
      <div class="al-u-gap-xs al-u-gap--row"><al-icon-pin></al-icon-pin><p>New Orleans, LA</p></div>
      <div class="al-u-gap-xs al-u-gap--row">
        <al-chip variant="secondary">Front-end Developer</al-chip>
        <al-chip variant="secondary">Design Systems</al-chip>
      </div>
      <al-button slot="actions-start">Apply</al-button>
      <div slot="actions-end" class="al-u-theme-typography-body-xs">3 days ago</div>
    </al-card>
    <al-card layout="inline">
      <div slot="image" class="al-l-job-board__card-image">
        <al-icon-star size="xl"></al-icon-star>
      </div>
      <al-heading variant="sm" tagName="h3"><Link to="#">Junior Front-end Developer</Link></al-heading>
      <div class="al-u-gap-xs al-u-gap--row"><al-icon-pin></al-icon-pin><p>New Orleans, LA</p></div>
      <div class="al-u-gap-xs al-u-gap--row">
        <al-chip variant="secondary">Front-end Developer</al-chip>
        <al-chip variant="secondary">Design Systems</al-chip>
        <al-chip variant="secondary">Remote</al-chip>
      </div>
      <al-button slot="actions-start">Apply</al-button>
      <div slot="actions-end" class="al-u-theme-typography-body-xs">3 days ago</div>
    </al-card>
    <al-card layout="inline">
      <div slot="image" class="al-l-job-board__card-image">
        <al-icon-star size="xl"></al-icon-star>
      </div>
      <al-heading variant="sm" tagName="h3"><Link to="#">Back-end Developer</Link></al-heading>
      <div class="al-u-gap-xs al-u-gap--row"><al-icon-pin></al-icon-pin><p>New Orleans, LA</p></div>
      <div class="al-u-gap-xs al-u-gap--row">
        <al-chip variant="secondary">Software</al-chip>
        <al-chip variant="secondary">API</al-chip>
      </div>
      <al-button slot="actions-start">Apply</al-button>
      <div slot="actions-end" class="al-u-theme-typography-body-xs">3 days ago</div>
    </al-card>
    <al-card layout="inline">
      <div slot="image" class="al-l-job-board__card-image">
        <al-icon-star size="xl"></al-icon-star>
      </div>
      <al-heading variant="sm" tagName="h3"><Link to="#">UX Designer</Link></al-heading>
      <div class="al-u-gap-xs al-u-gap--row"><al-icon-pin></al-icon-pin><p>New Orleans, LA</p></div>
      <div class="al-u-gap-xs al-u-gap--row">
        <al-chip variant="secondary">Design</al-chip>
        <al-chip variant="secondary">Remote</al-chip>
      </div>
      <al-button slot="actions-start">Apply</al-button>
      <div slot="actions-end" class="al-u-theme-typography-body-xs">4 days ago</div>
    </al-card>
    <al-card layout="inline">
      <div slot="image" class="al-l-job-board__card-image">
        <al-icon-star size="xl"></al-icon-star>
      </div>
      <al-heading variant="sm" tagName="h3"><Link to="#">Senior Front-end Developer</Link></al-heading>
      <div class="al-u-gap-xs al-u-gap--row"><al-icon-pin></al-icon-pin><p>New Orleans, LA</p></div>
      <div class="al-u-gap-xs al-u-gap--row">
        <al-chip variant="secondary">Front-end Developer</al-chip>
        <al-chip variant="secondary">Design Systems</al-chip>
      </div>
      <al-button slot="actions-start">Apply</al-button>
      <div slot="actions-end" class="al-u-theme-typography-body-xs">4 days ago</div>
    </al-card>
  </div>
  <al-pagination totalRecords="32"></al-pagination>
</div>
