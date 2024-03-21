import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AppComponent } from './app.component';
import { JobBoardComponent } from './job-board/job-board.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { FpoComponent } from './f-po/f-po.component';

@NgModule({
  imports: [
    BrowserModule,
    RouterModule.forRoot([
      { path: '', component: JobBoardComponent },
      { path: 'dashboard', component: DashboardComponent },
    ]),
  ],
  declarations: [
    AppComponent,
    JobBoardComponent,
    DashboardComponent,
    FpoComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent],
})
export class AppModule { }
