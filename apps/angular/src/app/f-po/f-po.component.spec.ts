import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FPoComponent } from './f-po.component';

describe('FPoComponent', () => {
  let component: FPoComponent;
  let fixture: ComponentFixture<FPoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FPoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FPoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
