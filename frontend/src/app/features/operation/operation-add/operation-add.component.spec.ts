import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPermissionsModule } from 'ngx-permissions';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationAddComponent } from './operation-add.component';

describe('OperationAddComponent', () => {
  let component: OperationAddComponent;
  let fixture: ComponentFixture<OperationAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxPermissionsModule],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [ OperationAddComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperationAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
