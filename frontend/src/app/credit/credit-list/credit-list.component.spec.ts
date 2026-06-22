import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { CreditListComponent } from './credit-list.component';
import { CreditService } from '../service/credit.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { UserService } from 'src/app/user/service/user.service';
import { ClientService } from 'src/app/client/service/client.service';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { CreditListPeriodPreset } from '../types/credit-list-summary.types';

describe('CreditListComponent', () => {
  let component: CreditListComponent;
  let fixture: ComponentFixture<CreditListComponent>;

  const creditServiceMock = {
    getCredit: jasmine.createSpy('getCredit').and.returnValue(of({
      statusCode: 200,
      data: { content: [], page: { totalElements: 0 } }
    })),
    getListSummary: jasmine.createSpy('getListSummary').and.returnValue(of({
      statusCode: 200,
      data: {
        startDate: '2026-06-01',
        endDate: '2026-06-21',
        closedTotal: { count: 0, totalAmount: 0, totalMargin: 0 },
        closedCredit: { count: 0, totalAmount: 0, totalMargin: 0 },
        closedCash: { count: 0, totalAmount: 0, totalMargin: 0 },
        closedTontine: { count: 0, totalAmount: 0, totalMargin: 0 },
        inProgressCredit: { count: 0, totalAmount: 0, totalMargin: 0, totalAmountRemaining: 0 },
        collectedCount: 0,
        collectedAmount: 0
      }
    })),
    searchCredits: jasmine.createSpy('searchCredits')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreditListComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: CreditService, useValue: creditServiceMock },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: AlertService, useValue: { showError: jasmine.createSpy('showError'), showSuccess: jasmine.createSpy('showSuccess'), showConfirmation: jasmine.createSpy('showConfirmation').and.returnValue(Promise.resolve(false)), showWarning: jasmine.createSpy('showWarning') } },
        { provide: TokenStorageService, useValue: { checkConnectedUser: jasmine.createSpy('checkConnectedUser'), getUser: jasmine.createSpy('getUser').and.returnValue({ id: 1, username: 'agent1' }) } },
        { provide: UserService, useValue: { hasProfile: jasmine.createSpy('hasProfile').and.returnValue(false) } },
        { provide: ClientService, useValue: { getAgents: jasmine.createSpy('getAgents').and.returnValue(of([])) } },
        { provide: ErrorHandlerService, useValue: {} },
        { provide: NgxSpinnerService, useValue: { show: jasmine.createSpy('show'), hide: jasmine.createSpy('hide') } }
      ]
    }).compileComponents();

    sessionStorage.clear();
    fixture = TestBed.createComponent(CreditListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should default period to month', () => {
    fixture.detectChanges();
    expect(component.periodPreset).toBe(CreditListPeriodPreset.MONTH);
  });

  it('should load summary on init', () => {
    fixture.detectChanges();
    expect(creditServiceMock.getListSummary).toHaveBeenCalled();
  });

  it('should toggle advanced search without resetting filters', () => {
    fixture.detectChanges();
    component.showAdvancedSearch = false;
    component.toggleAdvancedSearch();
    expect(component.showAdvancedSearch).toBeTrue();
    expect(creditServiceMock.getCredit).toHaveBeenCalledTimes(1);
  });
});
