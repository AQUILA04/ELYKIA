import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPermissionsModule } from 'ngx-permissions';
import { StatusBadgePipe } from '@shared/pipes/status-badge.pipe';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreditViewComponent } from './credit-view.component';

describe('CreditViewComponent', () => {
  let component: CreditViewComponent;
  let fixture: ComponentFixture<CreditViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxPermissionsModule],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [CreditViewComponent, StatusBadgePipe]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreditViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
