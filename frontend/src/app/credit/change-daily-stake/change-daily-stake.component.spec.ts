import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeDailyStakeComponent } from './change-daily-stake.component';

describe('ChangeDailyStakeComponent', () => {
  let component: ChangeDailyStakeComponent;
  let fixture: ComponentFixture<ChangeDailyStakeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChangeDailyStakeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangeDailyStakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
