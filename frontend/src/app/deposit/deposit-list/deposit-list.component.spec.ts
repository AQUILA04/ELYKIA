import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPermissionsModule } from 'ngx-permissions';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepositListComponent } from './deposit-list.component';

describe('DepositListComponent', () => {
  let component: DepositListComponent;
  let fixture: ComponentFixture<DepositListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxPermissionsModule],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [ DepositListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepositListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
