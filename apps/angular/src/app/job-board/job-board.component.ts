import { Component } from '@angular/core';

import "al-web-components/dist/components/badge/badge.js";
import "al-web-components/dist/components/button-group/button-group.js";
import "al-web-components/dist/components/button/button.js";
import "al-web-components/dist/components/card/card.js";
import "al-web-components/dist/components/checkbox-group/checkbox-group.js";
import "al-web-components/dist/components/checkbox/checkbox.js";
import "al-web-components/dist/components/chip-group/chip-group.js";
import "al-web-components/dist/components/dialog/dialog.js";
import "al-web-components/dist/components/divider/divider.js";
import "al-web-components/dist/components/heading/heading.js";
import "al-web-components/dist/components/icon/icons/filter.js";
import "al-web-components/dist/components/icon/icons/pin.js";
import "al-web-components/dist/components/icon/icons/star.js";
import "al-web-components/dist/components/input/input.js";
import "al-web-components/dist/components/link/link.js";
import "al-web-components/dist/components/list/list.js";
import "al-web-components/dist/components/list-item/list-item.js";
import "al-web-components/dist/components/pagination/pagination.js";
import "al-web-components/dist/components/radio-group/radio-group.js";
import "al-web-components/dist/components/radio/radio.js";
import "al-web-components/dist/components/range/range.js";
import "al-web-components/dist/components/search/search.js";
import "al-web-components/dist/components/select/select.js";
import "al-web-components/dist/components/text-passage/text-passage.js";

@Component({
  selector: 'app-job-board',
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
