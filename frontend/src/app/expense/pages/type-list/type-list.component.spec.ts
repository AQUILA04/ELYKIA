import type { MockedObject } from "vitest";
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseTypeListComponent } from './type-list.component';
import { ExpenseService } from '../../services/expense.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PaginatedResponse, ExpenseType } from '../../models/expense.model';
import { AlertService } from 'src/app/shared/service/alert.service';

describe('ExpenseTypeListComponent', () => {
    let component: ExpenseTypeListComponent;
    let fixture: ComponentFixture<ExpenseTypeListComponent>;
    let expenseServiceSpy: MockedObject<ExpenseService>;

    beforeEach(async () => {
        const spy = {
            getPaginatedExpenseTypes: vi.fn().mockName("ExpenseService.getPaginatedExpenseTypes"),
            deleteExpenseType: vi.fn().mockName("ExpenseService.deleteExpenseType")
        };
        const alertSpy = {
            showConfirmation: vi.fn().mockName("AlertService.showConfirmation")
        };

        await TestBed.configureTestingModule({
            declarations: [ExpenseTypeListComponent],
            imports: [
                MatSnackBarModule
            ],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                provideRouter([]),
                { provide: ExpenseService, useValue: spy },
                { provide: AlertService, useValue: alertSpy }
            ]
        })
            .compileComponents();

        expenseServiceSpy = TestBed.inject(ExpenseService) as MockedObject<ExpenseService>;
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ExpenseTypeListComponent);
        component = fixture.componentInstance;

        const dummyResponse: PaginatedResponse<ExpenseType> = {
            content: [],
            page: {
                number: 0,
                size: 10,
                totalElements: 0,
                totalPages: 0
            }
        };
        expenseServiceSpy.getPaginatedExpenseTypes.mockReturnValue(of(dummyResponse));

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load types on init', () => {
        expect(expenseServiceSpy.getPaginatedExpenseTypes).toHaveBeenCalledWith(0, 10);
    });
});
