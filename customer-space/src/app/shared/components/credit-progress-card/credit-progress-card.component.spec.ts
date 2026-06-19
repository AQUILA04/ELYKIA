import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreditProgressCardComponent } from './credit-progress-card.component';

describe('CreditProgressCardComponent', () => {
  let fixture: ComponentFixture<CreditProgressCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreditProgressCardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CreditProgressCardComponent);
    fixture.componentInstance.totalAmount = 100_000;
    fixture.componentInstance.paidAmount = 40_000;
    fixture.componentInstance.progressPercent = 40;
    fixture.detectChanges();
  });

  it('renders total amount', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('100');
  });
});
