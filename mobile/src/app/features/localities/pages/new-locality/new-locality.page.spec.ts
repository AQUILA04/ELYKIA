import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewLocalityPage } from './new-locality.page';

describe('NewLocalityPage', () => {
  let component: NewLocalityPage;
  let fixture: ComponentFixture<NewLocalityPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NewLocalityPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
