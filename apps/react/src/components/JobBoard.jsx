import { useState } from 'react';
import { ALBadge, ALButton, ALCard, ALCheckboxGroup, ALCheckbox, ALChip, ALDialog, ALDivider, ALHeading, ALIconFilter, ALIconPin, ALIconStar, ALInput, ALLayout, ALLink, ALList, ALListItem, ALPagination, ALRadioGroup, ALRadio, ALRange, ALSearch, ALSelect, ALStat } from 'al-react';
import './JobBoard.scss';

const jobs = [
  { id: 1, title: 'UX Designer', location: 'New Orleans, LA', chips: ['Design', 'Remote'], posted: '1 day ago' },
  { id: 2, title: 'Senior Front-end Developer', location: 'New Orleans, LA', chips: ['Front-end Developer', 'Design Systems'], posted: '1 day ago' },
  { id: 3, title: 'Junior Front-end Developer', location: 'New Orleans, LA', chips: ['Front-end Developer', 'Design Systems', 'Remote'], posted: '1 day ago' },
  { id: 4, title: 'Back-end Developer', location: 'New Orleans, LA', chips: ['Software', 'API'], posted: '2 days ago' },
  { id: 5, title: 'UX Designer', location: 'New Orleans, LA', chips: ['Design', 'Remote'], posted: '2 days ago' },
  { id: 6, title: 'Senior Front-end Developer', location: 'New Orleans, LA', chips: ['Front-end Developer', 'Design Systems'], posted: '3 days ago' },
  { id: 7, title: 'Junior Front-end Developer', location: 'New Orleans, LA', chips: ['Front-end Developer', 'Design Systems', 'Remote'], posted: '3 days ago' },
  { id: 8, title: 'Back-end Developer', location: 'New Orleans, LA', chips: ['Software', 'API'], posted: '3 days ago' },
  { id: 9, title: 'UX Designer', location: 'New Orleans, LA', chips: ['Design', 'Remote'], posted: '4 days ago' },
  { id: 10, title: 'Senior Front-end Developer', location: 'New Orleans, LA', chips: ['Front-end Developer', 'Design Systems'], posted: '4 days ago' }
];

export default function JobBoard({ children }) {
  const [filterStates, setFilterStates] = useState([
    'All locations', 'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ]);

  return (
    <ALLayout gap="xl" className="al-l-job-board">
      <ALHeading isBold={true} variant="lg" tagName="h2">Job Board</ALHeading>
      <ALLayout gap="md">
        <ALLayout variant="grid">
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
              <ALListItem key={index}>{item}</ALListItem>
              ))}
            </ALList>
          </ALSelect>
          <ALDialog className="al-u-grid__item col:12 col:6@lg col:3@xxl">
            <ALInput label="Filters" isReadonly={true} slot="trigger">
              <ALIconFilter slot="before"></ALIconFilter>
              <ALBadge slot="after">3</ALBadge>
            </ALInput>
            <ALHeading slot="header" isBold={true} variant="md" tagName="h2">Filter</ALHeading>
            <ALLayout gap="md" className="al-l-job-board__filter-dialog">
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
              <ALLayout variant="grid" columns={2} align="end">
                <ALCheckboxGroup label="Category">
                  <ALCheckbox>UX & UI Design</ALCheckbox>
                  <ALCheckbox>Print Design</ALCheckbox>
                  <ALCheckbox>Back-end Development</ALCheckbox>
                </ALCheckboxGroup>
                <ALCheckboxGroup label=" ">
                  <ALCheckbox isChecked={true}>Front-end Development</ALCheckbox>
                  <ALCheckbox isChecked={true}>Design Systems</ALCheckbox>
                  <ALCheckbox>Software Development</ALCheckbox>
                </ALCheckboxGroup>
              </ALLayout>
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
            </ALLayout>
            <ALLayout slot="footer" direction="row" grow>
              <ALButton>Show Results</ALButton>
              <ALButton variant="secondary">Reset</ALButton>
            </ALLayout>
          </ALDialog>
        </ALLayout>
        <ALLayout direction="row" wrap>
          <ALChip isDismissible={true}>Front-end Development</ALChip>
          <ALChip isDismissible={true}>Design Systems</ALChip>
          <ALChip isDismissible={true}>Full-time</ALChip>
        </ALLayout>
      </ALLayout>
      <ALDivider></ALDivider>
      <ALLayout gap="md">
        <ALLayout variant="grid" align="end">
          <ALStat className="al-u-grid__item col:12 col:5@md col:8@lg col:9@xl" value="32" label="Jobs found"></ALStat>
          <ALSelect className="al-u-grid__item col:12 col:7@md col:4@lg col:3@xl" label="Sort by">
            <ALList>
              <ALListItem>Date</ALListItem>
              <ALListItem>Title</ALListItem>
            </ALList>
          </ALSelect>
        </ALLayout>
        {jobs.map((job) => (
          <ALCard key={job.id} layout="inline">
            <div slot="image" className="al-l-job-board__card-image">
              <ALIconStar size="xl"></ALIconStar>
            </div>
            <ALHeading variant="sm" tagName="h3"><ALLink href="#">{job.title}</ALLink></ALHeading>
            <ALLayout direction="row" gap="sm"><ALIconPin></ALIconPin><p>{job.location}</p></ALLayout>
            <ALLayout direction="row" gap="sm">
              {job.chips.map((chip) => (
                <ALChip key={chip} variant="secondary">{chip}</ALChip>
              ))}
            </ALLayout>
            <ALButton slot="actions-start">Apply</ALButton>
            <div slot="actions-end" className="al-u-theme-typography-body-xs">{job.posted}</div>
          </ALCard>
        ))}
      </ALLayout>
      <ALPagination totalRecords="32"></ALPagination>
    </ALLayout>
  )
}
