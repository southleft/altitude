<script>
  import '@southleft/al-web-components/components/badge';
  import '@southleft/al-web-components/components/layout';
  import '@southleft/al-web-components/components/button';
  import '@southleft/al-web-components/components/card';
  import '@southleft/al-web-components/components/checkbox-group';
  import '@southleft/al-web-components/components/checkbox';
  import '@southleft/al-web-components/components/chip';
  import '@southleft/al-web-components/components/dialog';
  import '@southleft/al-web-components/components/divider';
  import '@southleft/al-web-components/components/header';
  import '@southleft/al-web-components/components/heading';
  import '@southleft/al-web-components/components/icon/icons/filter';
  import '@southleft/al-web-components/components/icon/icons/pin';
  import '@southleft/al-web-components/components/icon/icons/star';
  import '@southleft/al-web-components/components/input';
  import '@southleft/al-web-components/components/list-item';
  import '@southleft/al-web-components/components/list';
  import '@southleft/al-web-components/components/radio-group';
  import '@southleft/al-web-components/components/radio';
  import '@southleft/al-web-components/components/range';
  import '@southleft/al-web-components/components/search';
  import '@southleft/al-web-components/components/select';
  import '@southleft/al-web-components/components/stat';
  import '@southleft/al-web-components/components/link';
  import '@southleft/al-web-components/components/pagination';
  import './JobBoard.css';

  export const filterStates  = [
    'All locations', 'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  const jobs = [
    { title: 'UX Designer', location: 'New Orleans, LA', tags: ['Design', 'Remote'], posted: '1 day ago' },
    { title: 'Senior Front-end Developer', location: 'New Orleans, LA', tags: ['Front-end Developer', 'Design Systems'], posted: '1 day ago' },
    { title: 'Junior Front-end Developer', location: 'New Orleans, LA', tags: ['Front-end Developer', 'Design Systems', 'Remote'], posted: '1 day ago' },
    { title: 'Back-end Developer', location: 'New Orleans, LA', tags: ['Software', 'API'], posted: '2 days ago' },
    { title: 'UX Designer', location: 'New Orleans, LA', tags: ['Design', 'Remote'], posted: '2 days ago' },
    { title: 'Senior Front-end Developer', location: 'New Orleans, LA', tags: ['Front-end Developer', 'Design Systems'], posted: '3 days ago' },
    { title: 'Junior Front-end Developer', location: 'New Orleans, LA', tags: ['Front-end Developer', 'Design Systems', 'Remote'], posted: '3 days ago' },
    { title: 'Back-end Developer', location: 'New Orleans, LA', tags: ['Software', 'API'], posted: '3 days ago' },
    { title: 'UX Designer', location: 'New Orleans, LA', tags: ['Design', 'Remote'], posted: '4 days ago' },
    { title: 'Senior Front-end Developer', location: 'New Orleans, LA', tags: ['Front-end Developer', 'Design Systems'], posted: '4 days ago' }
  ];
</script>

<al-layout class="al-l-job-board" gap="xl">
  <al-heading isBold={true} variant="lg" tagName="h2">Job Board</al-heading>
  <al-layout gap="md">
    <al-layout variant="grid">
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
      <al-dialog class="al-u-grid__item col:12 col:6@lg col:3@xxl">
        <al-input label="Filters" isReadonly={true} slot="trigger">
          <al-icon-filter slot="before"></al-icon-filter>
          <al-badge slot="after">3</al-badge>
        </al-input>
        <al-heading slot="header" isBold={true} variant="md" tagName="h2">
          Filter
        </al-heading>
        <al-layout class="al-l-job-board__filter-dialog" gap="md">
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
          <al-layout variant="grid" columns="2" align="end">
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
          </al-layout>
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
        </al-layout>
        <al-layout slot="footer" direction="row" grow>
          <al-button>Show Results</al-button>
          <al-button variant="secondary">Reset</al-button>
        </al-layout>
      </al-dialog>
    </al-layout>
    <al-layout direction="row" wrap>
      <al-chip isDismissible={true}>Front-end Development</al-chip>
      <al-chip isDismissible={true}>Design Systems</al-chip>
      <al-chip isDismissible={true}>Full-time</al-chip>
    </al-layout>
  </al-layout>
  <al-divider></al-divider>
  <al-layout gap="md">
    <al-layout variant="grid" align="end">
      <al-stat class="al-u-grid__item col:12 col:5@md col:8@lg col:9@xl" value="32" label="Jobs found"></al-stat>
      <al-select class="al-u-grid__item col:12 col:7@md col:4@lg col:3@xl" label="Sort by">
        <al-list>
          <al-list-item>Date</al-list-item>
          <al-list-item>Title</al-list-item>
        </al-list>
      </al-select>
    </al-layout>
    {#each jobs as job}
    <al-card layout="inline">
      <div slot="image" class="al-l-job-board__card-image">
        <al-icon-star size="xl"></al-icon-star>
      </div>
      <al-heading variant="sm" tagName="h3"><al-link href="#">{job.title}</al-link></al-heading>
      <al-layout direction="row" gap="sm"><al-icon-pin></al-icon-pin><p>{job.location}</p></al-layout>
      <al-layout direction="row" gap="sm">
        {#each job.tags as tag}
        <al-chip variant="secondary">{tag}</al-chip>
        {/each}
      </al-layout>
      <al-button slot="actions-start">Apply</al-button>
      <div slot="actions-end" class="al-u-theme-typography-body-xs">{job.posted}</div>
    </al-card>
    {/each}
  </al-layout>
  <al-pagination totalRecords="32"></al-pagination>
</al-layout>
