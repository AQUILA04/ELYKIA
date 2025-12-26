import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecoveryClientListPage } from './recovery-client-list.page';

describe('RecoveryClientListPage', () => {
  let component: RecoveryClientListPage;
  let fixture: ComponentFixture<RecoveryClientListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RecoveryClientListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
