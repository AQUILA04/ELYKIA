import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { CreditListComponent } from './credit-list.component';
import { CreditService } from '../service/credit.service';
import { AlertService } from '@shared/service/alert.service';
import { TokenStorageService } from '@shared/service/token-storage.service';
import { UserService } from '@features/user/service/user.service';
import { ClientService } from '@features/client/service/client.service';
import { ErrorHandlerService } from '@shared/service/error-handler.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { AuthService } from '@features/auth/service/auth.service';
import { CreditListPeriodPreset } from '../types/credit-list-summary.types';

describe('CreditListComponent', () => {
    let component: CreditListComponent;
    let fixture: ComponentFixture<CreditListComponent>;

    const creditServiceMock = {
        getCredit: vi.fn().mockReturnValue(of({
            statusCode: 200,
            data: { content: [], page: { totalElements: 0 } }
        })),
        getListSummary: vi.fn().mockReturnValue(of({
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
        searchCredits: vi.fn()
    };

    beforeEach(async () => {
        creditServiceMock.getCredit.mockClear();
        creditServiceMock.getListSummary.mockClear();
        await TestBed.configureTestingModule({
            declarations: [CreditListComponent],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                { provide: CreditService, useValue: creditServiceMock },
                { provide: Router, useValue: { navigate: vi.fn() } },
                { provide: AlertService, useValue: { showError: vi.fn(), showSuccess: vi.fn(), showConfirmation: vi.fn().mockReturnValue(Promise.resolve(false)), showWarning: vi.fn() } },
                { provide: TokenStorageService, useValue: { checkConnectedUser: vi.fn(), getUser: vi.fn().mockReturnValue({ id: 1, username: 'agent1' }) } },
                { provide: UserService, useValue: { hasProfile: vi.fn().mockReturnValue(false) } },
                { provide: ClientService, useValue: { getAgents: vi.fn().mockReturnValue(of([])) } },
                { provide: AuthService, useValue: { isAdmin: vi.fn().mockReturnValue(false), hasPermission: vi.fn().mockResolvedValue(true), getCurrentUser: vi.fn().mockReturnValue({ id: 1, username: 'agent1' }) } },
                { provide: ErrorHandlerService, useValue: {} },
                { provide: NgxSpinnerService, useValue: { show: vi.fn(), hide: vi.fn() } }
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

    it('should load summary on init', async () => {
        fixture.detectChanges();
        await Promise.resolve();
        expect(creditServiceMock.getListSummary).toHaveBeenCalled();
    });

    it('should toggle advanced search without resetting filters', () => {
        fixture.detectChanges();
        component.showAdvancedSearch = false;
        component.toggleAdvancedSearch();
        expect(component.showAdvancedSearch).toBe(true);
        expect(creditServiceMock.getCredit).toHaveBeenCalledTimes(1);
    });
});
