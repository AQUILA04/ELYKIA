import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SyncErrorListPage } from './sync-error-list.page';

describe('SyncErrorListPage', () => {
  let component: SyncErrorListPage;
  let fixture: ComponentFixture<SyncErrorListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SyncErrorListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
