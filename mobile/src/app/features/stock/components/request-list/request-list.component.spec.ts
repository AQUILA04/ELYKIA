import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { By } from '@angular/platform-browser';

import { RequestListComponent } from './request-list.component';
import { StockRequest } from '../../models/stock-request.model';

describe('RequestListComponent', () => {
  let component: RequestListComponent;
  let fixture: ComponentFixture<RequestListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RequestListComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(RequestListComponent);
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

  it('should accept typed requests input', () => {
    const mockRequests: StockRequest[] = [{ id: 1, reference: 'REQ-001', status: 'PENDING', createdAt: '2026-01-01' }];
    component.requests = mockRequests;
    expect(component.requests).toEqual(mockRequests);
    expect(component.requests.length).toBe(1);
  });

  describe('loading state (AC3)', () => {
    it('should show skeleton list when loading is true', () => {
      component.loading = true;
      fixture.detectChanges();

      const skeletons = fixture.debugElement.queryAll(By.css('ion-skeleton-text'));
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should hide data list when loading is true', () => {
      component.loading = true;
      fixture.detectChanges();

      const items = fixture.debugElement.queryAll(By.css('.da-list-item'));
      expect(items.length).toBe(0);
    });

    it('should show data list and hide skeleton when loading is false', () => {
      const mockRequests: StockRequest[] = [{ id: 1, reference: 'REQ-001', status: 'PENDING', createdAt: '2026-01-01' }];
      component.loading = false;
      component.requests = mockRequests;
      fixture.detectChanges();

      const skeletons = fixture.debugElement.queryAll(By.css('ion-skeleton-text'));
      expect(skeletons.length).toBe(0);

      const items = fixture.debugElement.queryAll(By.css('.da-list-item'));
      expect(items.length).toBe(1);
    });
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

  describe('empty state', () => {
    it('should show empty state when requests is empty and not loading', () => {
      component.loading = false;
      component.requests = [];
      fixture.detectChanges();

      const emptyState = fixture.debugElement.query(By.css('.empty-state'));
      expect(emptyState).toBeTruthy();
    });
  });

  describe('operationTap event', () => {
    it('should emit operationTap when an item is clicked', () => {
      spyOn(component.operationTap, 'emit');
      const mockRequests: StockRequest[] = [{ id: 1, reference: 'REQ-001', status: 'PENDING', createdAt: '2026-01-01' }];
      component.requests = mockRequests;
      fixture.detectChanges();

      const item = fixture.debugElement.query(By.css('.da-list-item'));
      item.triggerEventHandler('click', null);

      expect(component.operationTap.emit).toHaveBeenCalledWith(mockRequests[0]);
    });
  });
});
