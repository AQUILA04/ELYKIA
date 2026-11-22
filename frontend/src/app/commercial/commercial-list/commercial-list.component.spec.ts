import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPermissionsModule } from 'ngx-permissions';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommercialListComponent } from './commercial-list.component';

describe('CommercialListComponent', () => {
  let component: CommercialListComponent;
  let fixture: ComponentFixture<CommercialListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxPermissionsModule],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [ CommercialListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommercialListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
