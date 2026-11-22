import { NO_ERRORS_SCHEMA } from '@angular/core';
import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ExpenseListComponent } from './list.component';
import { ExpenseService } from '../../services/expense.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { of } from 'rxjs';
import { PaginatedResponse, Expense } from '../../models/expense.model';
import { RouterTestingModule } from '@angular/router/testing';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AlertService } from 'src/app/shared/service/alert.service';

describe('ExpenseListComponent', () => {
    let component: ExpenseListComponent;
    let fixture: ComponentFixture<ExpenseListComponent>;
    let expenseServiceSpy: MockedObject<ExpenseService>;

    beforeEach(async () => {
        const spy = {
            getExpenses: vi.fn().mockName("ExpenseService.getExpenses"),
            deleteExpense: vi.fn().mockName("ExpenseService.deleteExpense"),
            getExpenseTypes: vi.fn().mockName("ExpenseService.getExpenseTypes"),
            cancelExpenses: vi.fn().mockName("ExpenseService.cancelExpenses")
        };
        spy.getExpenseTypes.mockReturnValue(of([]));

        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [ExpenseListComponent],
            imports: [
                CommonModule,
                MatDialogModule,
                MatSnackBarModule,
                MatPaginatorModule,
                MatTableModule,
                MatIconModule,
                MatTooltipModule,
                RouterTestingModule,
                NgxPermissionsModule.forRoot()
            ],
            providers: [
                { provide: ExpenseService, useValue: spy },
                { provide: AlertService, useValue: {
                        showDeleteConfirmation: vi.fn().mockName("AlertService.showDeleteConfirmation"),
                        showError: vi.fn().mockName("AlertService.showError")
                    } }
            ]
        })
            .compileComponents();

        expenseServiceSpy = TestBed.inject(ExpenseService) as MockedObject<ExpenseService>;
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ExpenseListComponent);
        component = fixture.componentInstance;

        // Default mock behavior
        const dummyResponse: PaginatedResponse<Expense> = {
            content: [],
            page: {
                totalElements: 0,
                totalPages: 0,
                size: 10,
                number: 0
            }
        };
        expenseServiceSpy.getExpenses.mockReturnValue(of(dummyResponse));

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load expenses on init', () => {
        expect(expenseServiceSpy.getExpenses).toHaveBeenCalledWith(0, 10);
    });

    it('should update table data when expenses loaded', () => {
        const dummyExpenses: Expense[] = [{ id: 1, amount: 100, description: 'Test', expenseDate: '2023-01-01', expenseTypeId: 1 }];
        const dummyResponse: PaginatedResponse<Expense> = {
            content: dummyExpenses,
            page: {
                totalElements: 1,
                totalPages: 1,
                size: 10,
                number: 0
            }
        };
        expenseServiceSpy.getExpenses.mockReturnValue(of(dummyResponse));

        component.loadExpenses();

        expect(component.expenses).toEqual(dummyExpenses);
    });
});
