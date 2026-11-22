import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreditListKpiComponent } from './credit-list-kpi.component';

describe('CreditListKpiComponent', () => {
  let component: CreditListKpiComponent;
  let fixture: ComponentFixture<CreditListKpiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreditListKpiComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CreditListKpiComponent);
    component = fixture.componentInstance;
    component.summary = {
      startDate: '2026-06-01',
      endDate: '2026-06-21',
      closedTotal: { count: 3, totalAmount: 300000, totalMargin: 70000 },
      closedCredit: { count: 2, totalAmount: 200000, totalMargin: 50000 },
      closedCash: { count: 1, totalAmount: 100000, totalMargin: 20000 },
      closedTontine: { count: 0, totalAmount: 0, totalMargin: 0 },
      inProgressCredit: { count: 1, totalAmount: 150000, totalMargin: 30000, totalAmountRemaining: 80000 },
      collectedCount: 10,
      collectedAmount: 90000
    };
    component.periodLabel = '01/06/2026 → 21/06/2026';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format FCFA values', () => {
    expect(component.formatFcfa(70000)).toContain('70');
  });

  it('should hide margin in subtitle for promoters', () => {
    component.showMargin = false;
    expect(component.salesSubtitle(3, 70000)).toBe('3 vente(s)');
  });

  it('should show margin in subtitle when allowed', () => {
    component.showMargin = true;
    expect(component.salesSubtitle(3, 70000)).toContain('Marge');
    expect(component.salesSubtitle(3, 70000)).toContain('70');
  });
});
