import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AlertService } from 'src/app/shared/service/alert.service';
import {
  CustomerMobileMoneySubmission,
  CustomerMobileMoneySubmissionService
} from '../../services/customer-mobile-money-submission.service';
import { CustomerTontineMmSubmissionService } from '../../services/customer-tontine-mm-submission.service';
import { CustomerPaymentsListComponent } from './customer-payments-list.component';

describe('CustomerPaymentsListComponent', () => {
  let component: CustomerPaymentsListComponent;
  let fixture: ComponentFixture<CustomerPaymentsListComponent>;
  let creditService: jasmine.SpyObj<CustomerMobileMoneySubmissionService>;
  let tontineService: jasmine.SpyObj<CustomerTontineMmSubmissionService>;
  let alertService: jasmine.SpyObj<AlertService>;

  const sampleRow: CustomerMobileMoneySubmission = {
    id: 42,
    clientId: 1,
    creditId: 10,
    installmentNumber: 1,
    expectedAmount: 5000,
    mobileMoneyPhone: '90000000',
    mobileMoneyAmount: 5000,
    mobileMoneyReference: 'REF-1',
    status: 'INITIE'
  };

  beforeEach(async () => {
    creditService = jasmine.createSpyObj('CustomerMobileMoneySubmissionService', ['list', 'validate', 'reject']);
    tontineService = jasmine.createSpyObj('CustomerTontineMmSubmissionService', ['list', 'validate', 'reject']);
    alertService = jasmine.createSpyObj('AlertService', [
      'toastSuccess',
      'toastError',
      'showConfirmation'
    ]);

    creditService.list.and.returnValue(of([sampleRow]));
    tontineService.list.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [CustomerPaymentsListComponent],
      providers: [
        { provide: CustomerMobileMoneySubmissionService, useValue: creditService },
        { provide: CustomerTontineMmSubmissionService, useValue: tontineService },
        { provide: AlertService, useValue: alertService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } }
        },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerPaymentsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load credit submissions', () => {
    expect(component).toBeTruthy();
    expect(component.submissions.length).toBe(1);
  });

  it('should ignore a second validate click while the first request is in flight', fakeAsync(() => {
    const pending = new Subject<CustomerMobileMoneySubmission>();
    creditService.validate.and.returnValue(pending.asObservable());
    creditService.list.and.returnValue(of([]));

    component.validate(sampleRow);
    component.validate(sampleRow);

    expect(creditService.validate).toHaveBeenCalledTimes(1);
    expect(component.isRowBusy('credit', 42)).toBeTrue();

    pending.next(sampleRow);
    pending.complete();
    tick();

    expect(component.submissions.find((s) => s.id === 42)).toBeUndefined();
    expect(component.isRowBusy('credit', 42)).toBeFalse();
    expect(alertService.toastSuccess).toHaveBeenCalled();
  }));

  it('should remove the row immediately after a successful reject', fakeAsync(() => {
    alertService.showConfirmation.and.returnValue(Promise.resolve(true));
    creditService.reject.and.returnValue(of(sampleRow));
    creditService.list.and.returnValue(of([]));

    component.reject(sampleRow);
    tick();

    expect(creditService.reject).toHaveBeenCalledWith(42);
    expect(component.submissions.find((s) => s.id === 42)).toBeUndefined();
    expect(alertService.toastSuccess).toHaveBeenCalled();
  }));
});
