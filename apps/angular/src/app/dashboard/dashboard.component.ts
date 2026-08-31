import { Component } from '@angular/core';

import "@southleft/al-web-components/components/calendar";
import "@southleft/al-web-components/components/empty-state";
import "@southleft/al-web-components/components/layout";

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {}
