import { useState } from 'react';
import { ALBadge, ALButtonGroup, ALButton, ALCard, ALCheckboxGroup, ALCheckbox, ALChipGroup, ALChip, ALDialog, ALDivider, ALHeading, ALIconFilter, ALIconPin, ALIconStar, ALInput, ALLink, ALList, ALListItem, ALPagination, ALRadioGroup, ALRadio, ALRange, ALSearch, ALSelect, ALTextPassage } from 'al-react/dist/src';
import './JobBoard.scss';

export default function JobBoard({ children }) {
  const [filterStates, setFilterStates] = useState([
    'All locations', 'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ]);

  return (
    <div className="al-u-gap-xl">
        <ALHeading isBold="true" variant="lg" tagName="h2">Job Board</ALHeading>
        <div className="al-u-gap">
          <div className="al-u-grid">
            <ALSearch className="al-u-grid__item col:12 col:12@lg col:6@xxl" label="Search by job title, company, keywords">
              <ALList>
                <ALListItem>Senior Designer</ALListItem>
                <ALListItem>Senior Developer</ALListItem>
                <ALListItem>Core Designer</ALListItem>
                <ALListItem>Core Developer</ALListItem>
              </ALList>
            </ALSearch>
            <ALSelect className="al-u-grid__item col:12 col:6@lg col:3@xxl" label="Location">
              <ALIconPin slot="before"></ALIconPin>
              <ALList>
                {filterStates.map((item, index) => (
                <ALListItem>{item}</ALListItem>
                ))}
              </ALList>
            </ALSelect>
            <ALDialog className="al-u-grid__item col:12 col:6@lg col:3@xxl" hasBackdrop="true">
              <ALInput label="Filters" isReadonly="true" slot="trigger">
                <ALIconFilter slot="before"></ALIconFilter>
                <ALBadge slot="after">3</ALBadge>
              </ALInput>
              <ALHeading slot="header" isBold="true" variant="md" tagName="h2">Filter</ALHeading>
              <div className="al-l-job-board__filter-dialog al-u-gap">
                <ALSelect label="Job Type" value="Full-time">
                  <ALList>
                    <ALListItem>All job types</ALListItem>
                    <ALListItem>Full-time</ALListItem>
                    <ALListItem>Part-time</ALListItem>
                    <ALListItem>Contract</ALListItem>
                    <ALListItem>Internship</ALListItem>
                  </ALList>
                </ALSelect>
                <ALDivider></ALDivider>
                <div className="al-u-grid cols:6@md al-u-grid--align-end">
                  <ALCheckboxGroup label="Category">
                    <ALCheckbox>UX & UI Design</ALCheckbox>
                    <ALCheckbox>Print Design</ALCheckbox>
                    <ALCheckbox>Back-end Development</ALCheckbox>
                  </ALCheckboxGroup>
                  <ALCheckboxGroup label=" ">
                    <ALCheckbox isChecked="true">Front-end Development</ALCheckbox>
                    <ALCheckbox isChecked="true">Design Systems</ALCheckbox>
                    <ALCheckbox>Software Development</ALCheckbox>
                  </ALCheckboxGroup>
                </div>
                <ALDivider></ALDivider>
                <ALRadioGroup label="Posted At">
                  <ALRadio>Any time</ALRadio>
                  <ALRadio>Last 24 hours</ALRadio>
                  <ALRadio>Last 3 days</ALRadio>
                  <ALRadio>Last 7 days</ALRadio>
                  <ALRadio>Last 14 days</ALRadio>
                  <ALRadio>Last 30 days</ALRadio>
                </ALRadioGroup>
                <ALDivider></ALDivider>
                <ALSelect label="Location">
                  <ALIconPin slot="before"></ALIconPin>
                  <ALList>
                    {filterStates.map((item, index) => (
                      <ALListItem key={index}>{item}</ALListItem>
                    ))}
                  </ALList>
                </ALSelect>
                <ALRange label="Radius" behavior="range" max="1000" step="10"></ALRange>
                <ALDivider></ALDivider>
                <ALCheckbox>Only remote jobs</ALCheckbox>
              </div>
              <ALButtonGroup slot="footer">
                <ALButton>Show Results</ALButton>
                <ALButton variant="secondary">Reset</ALButton>
              </ALButtonGroup>
            </ALDialog>
          </div>
          <ALChipGroup className="al-u-gap">
            <ALChip isDismissible="true">Front-end Development</ALChip>
            <ALChip isDismissible="true">Design Systems</ALChip>
            <ALChip isDismissible="true">Full-time</ALChip>
          </ALChipGroup>
        </div>
        <ALDivider></ALDivider>
        <div className="al-u-gap">
          <div className="al-u-grid al-u-grid--align-end">
            <ALTextPassage className="al-u-grid__item col:12 col:5@md col:8@lg col:9@xl"><p>We've found <strong>32</strong> jobs!</p></ALTextPassage>
            <ALSelect className="al-u-grid__item col:12 col:7@md col:4@lg col:3@xl" label="Sort by">
              <ALList>
                <ALListItem>Date</ALListItem>
                <ALListItem>Title</ALListItem>
              </ALList>
            </ALSelect>
          </div>
          <ALCard layout="inline">
            <div slot="image" className="al-l-job-board__card-image">
              <ALIconStar size="xl"></ALIconStar>
            </div>
            <ALHeading variant="sm" tagName="h3"><a href="#">UX Designer</a></ALHeading>
            <div className="al-u-gap-xs al-u-gap--row"><ALIconPin></ALIconPin><p>New Orleans, LA</p></div>
            <div className="al-u-gap-xs al-u-gap--row">
              <ALChip variant="secondary">Design</ALChip>
              <ALChip variant="secondary">Remote</ALChip>
            </div>
            <ALButton slot="actions-start">Apply</ALButton>
            <div slot="actions-end" className="al-u-theme-typography-body-xs">1 day ago</div>
          </ALCard>
          <ALCard layout="inline">
            <div slot="image" className="al-l-job-board__card-image">
              <ALIconStar size="xl"></ALIconStar>
            </div>
            <ALHeading variant="sm" tagName="h3"><a href="#">Senior Front-end Developer</a></ALHeading>
            <div className="al-u-gap-xs al-u-gap--row"><ALIconPin></ALIconPin><p>New Orleans, LA</p></div>
            <div className="al-u-gap-xs al-u-gap--row">
              <ALChip variant="secondary">Front-end Developer</ALChip>
              <ALChip variant="secondary">Design Systems</ALChip>
            </div>
            <ALButton slot="actions-start">Apply</ALButton>
            <div slot="actions-end" className="al-u-theme-typography-body-xs">1 day ago</div>
          </ALCard>
          <ALCard layout="inline">
            <div slot="image" className="al-l-job-board__card-image">
              <ALIconStar size="xl"></ALIconStar>
            </div>
            <ALHeading variant="sm" tagName="h3"><a href="#">Junior Front-end Developer</a></ALHeading>
            <div className="al-u-gap-xs al-u-gap--row"><ALIconPin></ALIconPin><p>New Orleans, LA</p></div>
            <div className="al-u-gap-xs al-u-gap--row">
              <ALChip variant="secondary">Front-end Developer</ALChip>
              <ALChip variant="secondary">Design Systems</ALChip>
              <ALChip variant="secondary">Remote</ALChip>
            </div>
            <ALButton slot="actions-start">Apply</ALButton>
            <div slot="actions-end" className="al-u-theme-typography-body-xs">1 day ago</div>
          </ALCard>
          <ALCard layout="inline">
            <div slot="image" className="al-l-job-board__card-image">
              <ALIconStar size="xl"></ALIconStar>
            </div>
            <ALHeading variant="sm" tagName="h3"><a href="#">Back-end Developer</a></ALHeading>
            <div className="al-u-gap-xs al-u-gap--row"><ALIconPin></ALIconPin><p>New Orleans, LA</p></div>
            <div className="al-u-gap-xs al-u-gap--row">
              <ALChip variant="secondary">Software</ALChip>
              <ALChip variant="secondary">API</ALChip>
            </div>
            <ALButton slot="actions-start">Apply</ALButton>
            <div slot="actions-end" className="al-u-theme-typography-body-xs">2 days ago</div>
          </ALCard>
          <ALCard layout="inline">
            <div slot="image" className="al-l-job-board__card-image">
              <ALIconStar size="xl"></ALIconStar>
            </div>
            <ALHeading variant="sm" tagName="h3"><a href="#">UX Designer</a></ALHeading>
            <div className="al-u-gap-xs al-u-gap--row"><ALIconPin></ALIconPin><p>New Orleans, LA</p></div>
            <div className="al-u-gap-xs al-u-gap--row">
              <ALChip variant="secondary">Design</ALChip>
              <ALChip variant="secondary">Remote</ALChip>
            </div>
            <ALButton slot="actions-start">Apply</ALButton>
            <div slot="actions-end" className="al-u-theme-typography-body-xs">2 days ago</div>
          </ALCard>
          <ALCard layout="inline">
            <div slot="image" className="al-l-job-board__card-image">
              <ALIconStar size="xl"></ALIconStar>
            </div>
            <ALHeading variant="sm" tagName="h3"><a href="#">Senior Front-end Developer</a></ALHeading>
            <div className="al-u-gap-xs al-u-gap--row"><ALIconPin></ALIconPin><p>New Orleans, LA</p></div>
            <div className="al-u-gap-xs al-u-gap--row">
              <ALChip variant="secondary">Front-end Developer</ALChip>
              <ALChip variant="secondary">Design Systems</ALChip>
            </div>
            <ALButton slot="actions-start">Apply</ALButton>
            <div slot="actions-end" className="al-u-theme-typography-body-xs">3 days ago</div>
          </ALCard>
          <ALCard layout="inline">
            <div slot="image" className="al-l-job-board__card-image">
              <ALIconStar size="xl"></ALIconStar>
            </div>
            <ALHeading variant="sm" tagName="h3"><a href="#">Junior Front-end Developer</a></ALHeading>
            <div className="al-u-gap-xs al-u-gap--row"><ALIconPin></ALIconPin><p>New Orleans, LA</p></div>
            <div className="al-u-gap-xs al-u-gap--row">
              <ALChip variant="secondary">Front-end Developer</ALChip>
              <ALChip variant="secondary">Design Systems</ALChip>
              <ALChip variant="secondary">Remote</ALChip>
            </div>
            <ALButton slot="actions-start">Apply</ALButton>
            <div slot="actions-end" className="al-u-theme-typography-body-xs">3 days ago</div>
          </ALCard>
          <ALCard layout="inline">
            <div slot="image" className="al-l-job-board__card-image">
              <ALIconStar size="xl"></ALIconStar>
            </div>
            <ALHeading variant="sm" tagName="h3"><a href="#">Back-end Developer</a></ALHeading>
            <div className="al-u-gap-xs al-u-gap--row"><ALIconPin></ALIconPin><p>New Orleans, LA</p></div>
            <div className="al-u-gap-xs al-u-gap--row">
              <ALChip variant="secondary">Software</ALChip>
              <ALChip variant="secondary">API</ALChip>
            </div>
            <ALButton slot="actions-start">Apply</ALButton>
            <div slot="actions-end" className="al-u-theme-typography-body-xs">3 days ago</div>
          </ALCard>
          <ALCard layout="inline">
            <div slot="image" className="al-l-job-board__card-image">
              <ALIconStar size="xl"></ALIconStar>
            </div>
            <ALHeading variant="sm" tagName="h3"><a href="#">UX Designer</a></ALHeading>
            <div className="al-u-gap-xs al-u-gap--row"><ALIconPin></ALIconPin><p>New Orleans, LA</p></div>
            <div className="al-u-gap-xs al-u-gap--row">
              <ALChip variant="secondary">Design</ALChip>
              <ALChip variant="secondary">Remote</ALChip>
            </div>
            <ALButton slot="actions-start">Apply</ALButton>
            <div slot="actions-end" className="al-u-theme-typography-body-xs">4 days ago</div>
          </ALCard>
          <ALCard layout="inline">
            <div slot="image" className="al-l-job-board__card-image">
              <ALIconStar size="xl"></ALIconStar>
            </div>
            <ALHeading variant="sm" tagName="h3"><a href="#">Senior Front-end Developer</a></ALHeading>
            <div className="al-u-gap-xs al-u-gap--row"><ALIconPin></ALIconPin><p>New Orleans, LA</p></div>
            <div className="al-u-gap-xs al-u-gap--row">
              <ALChip variant="secondary">Front-end Developer</ALChip>
              <ALChip variant="secondary">Design Systems</ALChip>
            </div>
            <ALButton slot="actions-start">Apply</ALButton>
            <div slot="actions-end" className="al-u-theme-typography-body-xs">4 days ago</div>
          </ALCard>
        </div>
        <ALPagination totalRecords="32"></ALPagination>
      </div>
  )
}