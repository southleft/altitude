import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobBoardComponent } from './job-board.component';

describe('JobBoardComponent', () => {
  let component: JobBoardComponent;
  let fixture: ComponentFixture<JobBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobBoardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(JobBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
