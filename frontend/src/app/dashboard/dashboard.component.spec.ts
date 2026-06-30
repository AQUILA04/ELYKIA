import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { FeatureFlagService, FeatureFlags } from '../shared/service/feature-flag.service';
import { ItemService } from '../article/service/item.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { TokenStorageService } from '../shared/service/token-storage.service';
import { Router } from '@angular/router';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide: FeatureFlagService,
          useValue: {
            isFeatureEnabled: (flag: FeatureFlags) => flag === FeatureFlags.DashboardV2,
            flags$: new BehaviorSubject<Record<string, boolean>>({ [FeatureFlags.DashboardV2]: true })
          }
        },
        {
          provide: ItemService,
          useValue: {
            outOfStock: jasmine.createSpy('outOfStock'),
            nextOutOfStock: jasmine.createSpy('nextOutOfStock')
          }
        },
        {
          provide: NgxSpinnerService,
          useValue: { show: jasmine.createSpy('show'), hide: jasmine.createSpy('hide') }
        },
        {
          provide: TokenStorageService,
          useValue: {
            checkConnectedUser: jasmine.createSpy('checkConnectedUser'),
            getToken: () => 'token'
          }
        },
        {
          provide: Router,
          useValue: { navigate: jasmine.createSpy('navigate') }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('enables dashboard v2 when feature flag is on', () => {
    expect(component.dashboardV2Enabled).toBeTrue();
  });
});
