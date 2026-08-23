import { Component } from '@angular/core';

import "al-web-components/components/badge";
import "al-web-components/components/layout";
import "al-web-components/components/button";
import "al-web-components/components/card";
import "al-web-components/components/checkbox-group";
import "al-web-components/components/checkbox";
import "al-web-components/components/dialog";
import "al-web-components/components/divider";
import "al-web-components/components/heading";
import "al-web-components/components/icon/icons/filter";
import "al-web-components/components/icon/icons/pin";
import "al-web-components/components/icon/icons/star";
import "al-web-components/components/input";
import "al-web-components/components/link";
import "al-web-components/components/list";
import "al-web-components/components/list-item";
import "al-web-components/components/pagination";
import "al-web-components/components/radio-group";
import "al-web-components/components/radio";
import "al-web-components/components/range";
import "al-web-components/components/search";
import "al-web-components/components/select";
import "al-web-components/components/stat";

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
