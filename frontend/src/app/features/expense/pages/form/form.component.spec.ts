import { NO_ERRORS_SCHEMA } from '@angular/core';
import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseFormComponent } from './form.component';
import { ExpenseService } from '../../services/expense.service';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ExpenseType } from '../../models/expense.model';

describe('ExpenseFormComponent', () => {
    let component: ExpenseFormComponent;
    let fixture: ComponentFixture<ExpenseFormComponent>;
    let expenseServiceSpy: MockedObject<ExpenseService>;

    beforeEach(async () => {
        const spy = {
            createExpense: vi.fn().mockName("ExpenseService.createExpense"),
            updateExpense: vi.fn().mockName("ExpenseService.updateExpense"),
            getExpense: vi.fn().mockName("ExpenseService.getExpense"),
            getExpenseTypes: vi.fn().mockName("ExpenseService.getExpenseTypes")
        };

        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [ExpenseFormComponent],
            imports: [
                ReactiveFormsModule,
                FormsModule,
                MatSnackBarModule,
                MatFormFieldModule,
                MatInputModule,
                MatSelectModule,
                MatDatepickerModule,
                MatNativeDateModule,
                MatCardModule,
                RouterTestingModule
            ],
            providers: [
                { provide: ExpenseService, useValue: spy }
            ]
        })
            .compileComponents();

        expenseServiceSpy = TestBed.inject(ExpenseService) as MockedObject<ExpenseService>;
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ExpenseFormComponent);
        component = fixture.componentInstance;

        // Mock getExpenseTypes
        const dummyTypes: ExpenseType[] = [{ id: 1, name: 'Type 1', code: 'T1' }];
        expenseServiceSpy.getExpenseTypes.mockReturnValue(of(dummyTypes));

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load expense types on init', () => {
        expect(expenseServiceSpy.getExpenseTypes).toHaveBeenCalled();
    });
});
