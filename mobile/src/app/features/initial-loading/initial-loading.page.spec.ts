import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InitialLoadingPage } from './initial-loading.page';

describe('InitialLoadingPage', () => {
  let component: InitialLoadingPage;
  let fixture: ComponentFixture<InitialLoadingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InitialLoadingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
