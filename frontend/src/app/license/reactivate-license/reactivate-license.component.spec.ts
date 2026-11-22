import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPermissionsModule } from 'ngx-permissions';
import { LicenseKeyFormatterPipe } from 'src/app/shared/pipe/license-key-formatter.pipe';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactivateLicenseComponent } from './reactivate-license.component';

describe('ReactivateLicenseComponent', () => {
  let component: ReactivateLicenseComponent;
  let fixture: ComponentFixture<ReactivateLicenseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxPermissionsModule],
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [ReactivateLicenseComponent, LicenseKeyFormatterPipe]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReactivateLicenseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
