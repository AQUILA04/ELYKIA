import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AlertService } from 'src/app/shared/service/alert.service';
import { CustomerMobileMoneySubmission, CustomerMobileMoneySubmissionService } from '../../services/customer-mobile-money-submission.service';
import { CustomerTontineMmSubmissionService } from '../../services/customer-tontine-mm-submission.service';
import { CustomerPaymentsListComponent } from './customer-payments-list.component';

describe('CustomerPaymentsListComponent', () => {
    let component: CustomerPaymentsListComponent;
    let fixture: ComponentFixture<CustomerPaymentsListComponent>;
    let creditService: MockedObject<Pick<CustomerMobileMoneySubmissionService, 'list' | 'validate' | 'reject'>>;
    let tontineService: MockedObject<Pick<CustomerTontineMmSubmissionService, 'list' | 'validate' | 'reject'>>;
    let alertService: MockedObject<Pick<AlertService, 'toastSuccess' | 'toastError' | 'showConfirmation'>>;

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
        creditService = {
            list: vi.fn().mockName("CustomerMobileMoneySubmissionService.list"),
            validate: vi.fn().mockName("CustomerMobileMoneySubmissionService.validate"),
            reject: vi.fn().mockName("CustomerMobileMoneySubmissionService.reject")
        };
        tontineService = {
            list: vi.fn().mockName("CustomerTontineMmSubmissionService.list"),
            validate: vi.fn().mockName("CustomerTontineMmSubmissionService.validate"),
            reject: vi.fn().mockName("CustomerTontineMmSubmissionService.reject")
        };
        alertService = {
            toastSuccess: vi.fn().mockName("AlertService.toastSuccess"),
            toastError: vi.fn().mockName("AlertService.toastError"),
            showConfirmation: vi.fn().mockName("AlertService.showConfirmation")
        };

        creditService.list.mockReturnValue(of([sampleRow]));
        tontineService.list.mockReturnValue(of([]));

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
                { provide: Router, useValue: { navigate: vi.fn() } }
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

    it('should ignore a second validate click while the first request is in flight', async () => {
        const pending = new Subject<CustomerMobileMoneySubmission>();
        creditService.validate.mockReturnValue(pending.asObservable());
        creditService.list.mockReturnValue(of([]));

        component.validate(sampleRow);
        component.validate(sampleRow);

        expect(creditService.validate).toHaveBeenCalledTimes(1);
        expect(component.isRowBusy('credit', 42)).toBe(true);

        pending.next(sampleRow);
        pending.complete();
        await Promise.resolve();

        expect(component.submissions.find((s) => s.id === 42)).toBeUndefined();
        expect(component.isRowBusy('credit', 42)).toBe(false);
        expect(alertService.toastSuccess).toHaveBeenCalled();
    });

    it('should remove the row immediately after a successful reject', async () => {
        alertService.showConfirmation.mockReturnValue(Promise.resolve(true));
        creditService.reject.mockReturnValue(of(sampleRow));
        creditService.list.mockReturnValue(of([]));

        component.reject(sampleRow);
        await Promise.resolve();

        expect(creditService.reject).toHaveBeenCalledWith(42);
        expect(component.submissions.find((s) => s.id === 42)).toBeUndefined();
        expect(alertService.toastSuccess).toHaveBeenCalled();
    });
});
