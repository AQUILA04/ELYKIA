import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DistributionItemComponent } from './distribution-item.component';

describe('DistributionItemComponent', () => {
  let component: DistributionItemComponent;
  let fixture: ComponentFixture<DistributionItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      imports: [DistributionItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DistributionItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
