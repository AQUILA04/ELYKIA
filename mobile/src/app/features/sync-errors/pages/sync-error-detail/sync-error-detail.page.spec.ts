import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SyncErrorDetailPage } from './sync-error-detail.page';

describe('SyncErrorDetailPage', () => {
  let component: SyncErrorDetailPage;
  let fixture: ComponentFixture<SyncErrorDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SyncErrorDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
