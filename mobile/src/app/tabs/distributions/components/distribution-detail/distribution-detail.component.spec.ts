import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DistributionDetailComponent } from './distribution-detail.component';

describe('DistributionDetailComponent', () => {
  let component: DistributionDetailComponent;
  let fixture: ComponentFixture<DistributionDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      imports: [DistributionDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DistributionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
