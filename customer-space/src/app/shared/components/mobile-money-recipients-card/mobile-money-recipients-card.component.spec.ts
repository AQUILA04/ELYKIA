import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { MobileMoneyRecipientsCardComponent } from './mobile-money-recipients-card.component';

describe('MobileMoneyRecipientsCardComponent', () => {
  let fixture: ComponentFixture<MobileMoneyRecipientsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileMoneyRecipientsCardComponent, IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileMoneyRecipientsCardComponent);
  });

  it('shows recipient numbers when provided', () => {
    fixture.componentInstance.recipients = {
      mixxNumber: '90001111',
      moovNumber: '90002222',
      collectorName: 'Komlan',
    };
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('90001111');
    expect(el.textContent).toContain('90002222');
    expect(el.textContent).toContain('Komlan');
  });

  it('shows loading state', () => {
    fixture.componentInstance.loading = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-spinner')).toBeTruthy();
  });
});
