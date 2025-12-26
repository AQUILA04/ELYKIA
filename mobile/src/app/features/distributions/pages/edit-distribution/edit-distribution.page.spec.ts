import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditDistributionPage } from './edit-distribution.page';

describe('EditDistributionPage', () => {
  let component: EditDistributionPage;
  let fixture: ComponentFixture<EditDistributionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditDistributionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});