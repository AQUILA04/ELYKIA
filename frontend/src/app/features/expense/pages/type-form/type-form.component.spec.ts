import { NO_ERRORS_SCHEMA } from '@angular/core';
import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseTypeFormComponent } from './type-form.component';
import { ExpenseService } from '../../services/expense.service';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { RouterTestingModule } from '@angular/router/testing';

describe('ExpenseTypeFormComponent', () => {
    let component: ExpenseTypeFormComponent;
    let fixture: ComponentFixture<ExpenseTypeFormComponent>;
    let expenseServiceSpy: MockedObject<ExpenseService>;

    beforeEach(async () => {
        const spy = {
            createExpenseType: vi.fn().mockName("ExpenseService.createExpenseType"),
            updateExpenseType: vi.fn().mockName("ExpenseService.updateExpenseType"),
            getExpenseType: vi.fn().mockName("ExpenseService.getExpenseType")
        };

        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [ExpenseTypeFormComponent],
            imports: [
                ReactiveFormsModule,
                FormsModule,
                MatSnackBarModule,
                MatFormFieldModule,
                MatInputModule,
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
        fixture = TestBed.createComponent(ExpenseTypeFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
