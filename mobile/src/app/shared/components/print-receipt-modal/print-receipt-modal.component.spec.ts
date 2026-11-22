import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintReceiptModalComponent } from './print-receipt-modal.component';

describe('PrintReceiptModalComponent', () => {
  let component: PrintReceiptModalComponent;
  let fixture: ComponentFixture<PrintReceiptModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [PrintReceiptModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintReceiptModalComponent);
    component = fixture.componentInstance;
    component.distribution = {
      id: 'dist-1',
      reference: 'DIST-001',
      totalAmount: 10000,
      advance: 2000,
      remainingAmount: 8000,
      dailyPayment: 500,
      createdAt: '2026-01-01',
    } as any;
    component.client = {
      id: 'client-1',
      firstname: 'Jean',
      lastname: 'Dupont',
    } as any;
    component.articles = [];
    component.commercial = { username: 'commercial1' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
