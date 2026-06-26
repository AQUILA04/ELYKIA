import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { RecoveryTimelinePage } from './recovery-timeline.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';

describe('RecoveryTimelinePage', () => {
  let fixture: ComponentFixture<RecoveryTimelinePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecoveryTimelinePage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: '101' } } } },
        {
          provide: CustomerApiService,
          useValue: {
            getRecoveries: () => of([
              { id: '1', installmentNumber: 3, amount: 35000, paymentDate: '2026-04-01', status: 'INITIE' },
            ]),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RecoveryTimelinePage);
  });

  it('loads recoveries and finds next payment', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.recoveries.length).toBe(1);
    expect(fixture.componentInstance.nextRecovery?.installmentNumber).toBe(3);
  });
});
