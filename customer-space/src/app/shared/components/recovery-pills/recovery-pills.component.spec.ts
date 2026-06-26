import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecoveryPillsComponent } from './recovery-pills.component';

describe('RecoveryPillsComponent', () => {
  let fixture: ComponentFixture<RecoveryPillsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RecoveryPillsComponent] }).compileComponents();
    fixture = TestBed.createComponent(RecoveryPillsComponent);
    fixture.componentInstance.totalInstallments = 4;
    fixture.componentInstance.recoveries = [
      { id: '1', installmentNumber: 1, amount: 1000, paymentDate: '2026-01-01', status: 'VALIDE' },
      { id: '2', installmentNumber: 2, amount: 1000, paymentDate: '2026-02-01', status: 'RETARD' },
    ];
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
  });

  it('builds pills with correct statuses', () => {
    expect(fixture.componentInstance.pills.length).toBe(4);
    expect(fixture.componentInstance.pills[0].status).toBe('VALIDE');
    expect(fixture.componentInstance.pills[1].status).toBe('RETARD');
    expect(fixture.componentInstance.pills[2].status).toBe('RESTANT');
  });
});
