import { MatSelectModule } from '@angular/material/select';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPermissionsModule } from 'ngx-permissions';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepositAddComponent } from './deposit-add.component';

describe('DepositAddComponent', () => {
  let component: DepositAddComponent;
  let fixture: ComponentFixture<DepositAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatSelectModule, CommonModule, FormsModule, ReactiveFormsModule, NgxPermissionsModule],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [ DepositAddComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepositAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
