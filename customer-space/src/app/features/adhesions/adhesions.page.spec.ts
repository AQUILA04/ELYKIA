import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { AdhesionsPage } from './adhesions.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { FeatureFlagService, FeatureFlags } from '../../shared/services/feature-flag.service';

describe('AdhesionsPage', () => {
  let fixture: ComponentFixture<AdhesionsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdhesionsPage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        {
          provide: CustomerApiService,
          useValue: {
            getAdhesions: () => of({
              adhesions: [{
                id: 1,
                clientId: 4,
                adhesionType: 'PERSONAL',
                status: 'ACTIVE',
                adhesionFee: 0,
                feeWaived: true,
                balance: 500,
                creditCeiling: 35000,
                source: 'MIGRATION',
              }],
              submissions: [],
            }),
            declareAdhesion: () => of({ id: 9, status: 'INITIE' }),
          },
        },
        {
          provide: FeatureFlagService,
          useValue: { isFeatureEnabled: (flag: FeatureFlags) => flag === FeatureFlags.DualCreditAuthorization },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdhesionsPage);
  });

  it('shows the personal ceiling', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Personnel');
    expect(text).toContain('35');
  });

  it('requires phone and reference before declaring', () => {
    fixture.detectChanges();
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.error).toContain('Renseignez');
  });
});
