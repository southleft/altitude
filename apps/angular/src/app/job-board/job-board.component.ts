import { Component } from '@angular/core';

import "@southleft/al-web-components/components/badge";
import "@southleft/al-web-components/components/layout";
import "@southleft/al-web-components/components/button";
import "@southleft/al-web-components/components/card";
import "@southleft/al-web-components/components/checkbox-group";
import "@southleft/al-web-components/components/checkbox";
import "@southleft/al-web-components/components/dialog";
import "@southleft/al-web-components/components/divider";
import "@southleft/al-web-components/components/heading";
import "@southleft/al-web-components/components/icon/icons/filter";
import "@southleft/al-web-components/components/icon/icons/pin";
import "@southleft/al-web-components/components/icon/icons/star";
import "@southleft/al-web-components/components/input";
import "@southleft/al-web-components/components/link";
import "@southleft/al-web-components/components/list";
import "@southleft/al-web-components/components/list-item";
import "@southleft/al-web-components/components/pagination";
import "@southleft/al-web-components/components/radio-group";
import "@southleft/al-web-components/components/radio";
import "@southleft/al-web-components/components/range";
import "@southleft/al-web-components/components/search";
import "@southleft/al-web-components/components/select";
import "@southleft/al-web-components/components/stat";

interface JobListing {
  title: string;
  location: string;
  tags: string[];
  postedAgo: string;
}

@Component({
  selector: 'app-job-board',
  standalone: false,
  templateUrl: './job-board.component.html',
  styleUrl: './job-board.component.scss'
})
export class JobBoardComponent {
  filterStates: string[] = [
    'All locations', 'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  jobs: JobListing[] = [
    { title: 'UX Designer', location: 'New Orleans, LA', tags: ['Design', 'Remote'], postedAgo: '1 day ago' },
    { title: 'Senior Front-end Developer', location: 'New Orleans, LA', tags: ['Front-end Developer', 'Design Systems'], postedAgo: '1 day ago' },
    { title: 'Junior Front-end Developer', location: 'New Orleans, LA', tags: ['Front-end Developer', 'Design Systems', 'Remote'], postedAgo: '1 day ago' },
    { title: 'Back-end Developer', location: 'New Orleans, LA', tags: ['Software', 'API'], postedAgo: '2 days ago' },
    { title: 'UX Designer', location: 'New Orleans, LA', tags: ['Design', 'Remote'], postedAgo: '2 days ago' },
    { title: 'Senior Front-end Developer', location: 'New Orleans, LA', tags: ['Front-end Developer', 'Design Systems'], postedAgo: '3 days ago' },
    { title: 'Junior Front-end Developer', location: 'New Orleans, LA', tags: ['Front-end Developer', 'Design Systems', 'Remote'], postedAgo: '3 days ago' },
    { title: 'Back-end Developer', location: 'New Orleans, LA', tags: ['Software', 'API'], postedAgo: '3 days ago' },
    { title: 'UX Designer', location: 'New Orleans, LA', tags: ['Design', 'Remote'], postedAgo: '4 days ago' },
    { title: 'Senior Front-end Developer', location: 'New Orleans, LA', tags: ['Front-end Developer', 'Design Systems'], postedAgo: '4 days ago' },
  ];
}
