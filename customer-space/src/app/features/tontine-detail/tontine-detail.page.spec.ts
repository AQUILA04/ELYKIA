import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { TontineDetailPage } from './tontine-detail.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { LayoutService } from '../../shared/layout/layout.service';

describe('TontineDetailPage', () => {
  let fixture: ComponentFixture<TontineDetailPage>;
  let api: { getTontineContributionById: jasmine.Spy };

  beforeEach(async () => {
    api = {
      getTontineContributionById: jasmine.createSpy('getTontineContributionById').and.returnValue(
        of({ memberId: '77', validatedMonths: 5, monthlySummaries: [] }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [TontineDetailPage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: '77' } } } },
        { provide: CustomerApiService, useValue: api },
        { provide: LayoutService, useValue: { isDesktop: () => false, refresh: () => undefined } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TontineDetailPage);
  });

  it('loads tontine detail and falls back to 10 months when booklet is empty', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.detail?.memberId).toBe('77');
    expect(fixture.componentInstance.memberMonths).toBe(10);
    expect(fixture.componentInstance.progressPercent()).toBe(50);
  });

  it('uses booklet row count for memberMonths and desktop progress', () => {
    api.getTontineContributionById.and.returnValue(
      of({
        memberId: '77',
        validatedMonths: 3,
        monthlySummaries: [
          { month: 'Juin', year: 2026 },
          { month: 'Juillet', year: 2026 },
          { month: 'Août', year: 2026 },
          { month: 'Septembre', year: 2026 },
          { month: 'Octobre', year: 2026 },
          { month: 'Novembre', year: 2026 },
          { month: 'Décembre', year: 2026 },
        ],
      }),
    );
    fixture = TestBed.createComponent(TontineDetailPage);
    fixture.detectChanges();
    expect(fixture.componentInstance.memberMonths).toBe(7);
    expect(fixture.componentInstance.desktopProgressPercent()).toBe(43);
    expect(fixture.componentInstance.progressPercent()).toBe(30);
  });
});
