import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { TontineTimelinePage } from './tontine-timeline.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';

describe('TontineTimelinePage', () => {
  let fixture: ComponentFixture<TontineTimelinePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TontineTimelinePage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: '77' } } } },
        {
          provide: CustomerApiService,
          useValue: {
            getTontinePayments: () => of({ items: [{ id: 'p1', amount: 1200, status: 'VALIDE' }] }),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TontineTimelinePage);
  });

  it('loads tontine payments', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.payments.length).toBe(1);
  });
});
