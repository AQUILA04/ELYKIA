import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { By } from '@angular/platform-browser';

import { StockReturnListComponent } from './stock-return-list.component';
import { StockReturn } from '../../models/stock-return.model';

describe('StockReturnListComponent', () => {
  let component: StockReturnListComponent;
  let fixture: ComponentFixture<StockReturnListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StockReturnListComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(StockReturnListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept context input', () => {
    component.context = 'STANDARD';
    expect(component.context).toBe('STANDARD');
    component.context = 'TONTINE';
    expect(component.context).toBe('TONTINE');
  });

  it('should accept typed returns input', () => {
    const mockReturns: StockReturn[] = [{ id: 1, reference: 'RET-001', status: 'PENDING', createdAt: '2026-01-01' }];
    component.returns = mockReturns;
    expect(component.returns).toEqual(mockReturns);
    expect(component.returns.length).toBe(1);
  });

  describe('getBadgeClass', () => {
    it('should return status-pending for null status', () => {
      expect(component.getBadgeClass(null)).toBe('status-pending');
    });

    it('should return status-pending for undefined status', () => {
      expect(component.getBadgeClass(undefined)).toBe('status-pending');
    });

    it('should return lowercased status class for valid status', () => {
      expect(component.getBadgeClass('APPROVED')).toBe('status-approved');
      expect(component.getBadgeClass('Rejected')).toBe('status-rejected');
    });
  });

  describe('touch targets (AC2)', () => {
    it('should apply minimum 44x44px touch target class to list items', () => {
      const mockReturns: StockReturn[] = [{ id: 1, reference: 'RET-001', status: 'PENDING', createdAt: '2026-01-01' }];
      component.returns = mockReturns;
      fixture.detectChanges();

      const items = fixture.debugElement.queryAll(By.css('ion-item'));
      expect(items.length).toBeGreaterThan(0);

      items.forEach(item => {
        expect(item.nativeElement.classList.contains('min-touch-target')).toBeTrue();
      });
    });
  });

  describe('trackById', () => {
    it('should return the id of the return item', () => {
      const mockReturn: StockReturn = { id: 42, reference: 'RET-042', status: 'APPROVED', createdAt: '2026-01-02' };
      expect(component.trackById(0, mockReturn)).toBe(42);
    });
  });
});
