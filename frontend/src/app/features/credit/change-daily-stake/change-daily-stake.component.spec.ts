import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPermissionsModule } from 'ngx-permissions';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeDailyStakeComponent } from './change-daily-stake.component';

describe('ChangeDailyStakeComponent', () => {
  let component: ChangeDailyStakeComponent;
  let fixture: ComponentFixture<ChangeDailyStakeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxPermissionsModule],
      schemas: [NO_ERRORS_SCHEMA],
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
