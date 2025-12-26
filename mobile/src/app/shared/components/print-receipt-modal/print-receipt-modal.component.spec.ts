import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PrintReceiptModalComponent } from './print-receipt-modal.component';

describe('PrintReceiptModalComponent', () => {
  let component: PrintReceiptModalComponent;
  let fixture: ComponentFixture<PrintReceiptModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [PrintReceiptModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintReceiptModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
