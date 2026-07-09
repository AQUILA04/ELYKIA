import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { TontinesPage } from './tontines.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';

describe('TontinesPage', () => {
  let fixture: ComponentFixture<TontinesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TontinesPage, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        {
          provide: CustomerApiService,
          useValue: {
            getTontineContributions: () => of([{ memberId: '1', sessionYear: 2026 }]),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TontinesPage);
  });

  it('loads tontines list', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.tontines.length).toBe(1);
    expect(fixture.componentInstance.isLoading).toBeFalse();
  });
});
