import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SyncManualPage } from './sync-manual.page';

describe('SyncManualPage', () => {
  let component: SyncManualPage;
  let fixture: ComponentFixture<SyncManualPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SyncManualPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
