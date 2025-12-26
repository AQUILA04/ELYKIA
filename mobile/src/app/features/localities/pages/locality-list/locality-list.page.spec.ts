import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocalityListPage } from './locality-list.page';

describe('LocalityListPage', () => {
  let component: LocalityListPage;
  let fixture: ComponentFixture<LocalityListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LocalityListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
