import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { TontineDetailPage } from './tontine-detail.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';

describe('TontineDetailPage', () => {
  let fixture: ComponentFixture<TontineDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TontineDetailPage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: '77' } } } },
        {
          provide: CustomerApiService,
          useValue: {
            getTontineContributionById: () => of({ memberId: '77', validatedMonths: 5, monthlySummaries: [] }),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TontineDetailPage);
  });

  it('loads tontine detail', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.detail?.memberId).toBe('77');
    expect(fixture.componentInstance.progressPercent()).toBe(50);
  });
});
