import { Component } from '@angular/core';

import "al-web-components/components/badge";
import "al-web-components/components/button-group";
import "al-web-components/components/button";
import "al-web-components/components/card";
import "al-web-components/components/checkbox-group";
import "al-web-components/components/checkbox";
import "al-web-components/components/chip-group";
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
import "al-web-components/components/text-passage";

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

}
