import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseListComponent } from './list.component';
import { ExpenseService } from '../../services/expense.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon'; // Import MatIconModule
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // Import BrowserAnimationsModule
import { of, throwError } from 'rxjs';
import { PaginatedResponse, Expense } from '../../models/expense.model';
import { RouterTestingModule } from '@angular/router/testing';

describe('ExpenseListComponent', () => {
    let component: ExpenseListComponent;
    let fixture: ComponentFixture<ExpenseListComponent>;
    let expenseServiceSpy: jasmine.SpyObj<ExpenseService>;

    beforeEach(async () => {
        const spy = jasmine.createSpyObj('ExpenseService', ['getExpenses', 'deleteExpense']);

        await TestBed.configureTestingModule({
            declarations: [ExpenseListComponent],
            imports: [
                MatDialogModule,
                MatSnackBarModule,
                MatPaginatorModule,
                MatTableModule,
                MatIconModule, // Add MatIconModule
                BrowserAnimationsModule, // Add BrowserAnimationsModule
                RouterTestingModule
            ],
            providers: [
                { provide: ExpenseService, useValue: spy }
            ]
        })
            .compileComponents();

        expenseServiceSpy = TestBed.inject(ExpenseService) as jasmine.SpyObj<ExpenseService>;
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ExpenseListComponent);
        component = fixture.componentInstance;

        // Default mock behavior
        const dummyResponse: PaginatedResponse<Expense> = {
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 10,
            number: 0
        };
        expenseServiceSpy.getExpenses.and.returnValue(of(dummyResponse));

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
            totalElements: 1,
            totalPages: 1,
            size: 10,
            number: 0
        };
        expenseServiceSpy.getExpenses.and.returnValue(of(dummyResponse));

        component.loadExpenses();

        expect(component.dataSource.data).toEqual(dummyExpenses);
        // expect(component.totalElements).toBe(1); // totalElements property does not exist in component
    });
});
