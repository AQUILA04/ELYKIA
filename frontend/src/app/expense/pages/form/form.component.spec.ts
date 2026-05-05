import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseFormComponent } from './form.component';
import { ExpenseService } from '../../services/expense.service';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ExpenseType } from '../../models/expense.model';

describe('ExpenseFormComponent', () => {
    let component: ExpenseFormComponent;
    let fixture: ComponentFixture<ExpenseFormComponent>;
    let expenseServiceSpy: jasmine.SpyObj<ExpenseService>;

    beforeEach(async () => {
        const spy = jasmine.createSpyObj('ExpenseService', ['createExpense', 'updateExpense', 'getExpense', 'getExpenseTypes']);

        await TestBed.configureTestingModule({
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
                BrowserAnimationsModule,
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
        fixture = TestBed.createComponent(ExpenseFormComponent);
        component = fixture.componentInstance;

        // Mock getExpenseTypes
        const dummyTypes: ExpenseType[] = [{ id: 1, name: 'Type 1', code: 'T1' }];
        expenseServiceSpy.getExpenseTypes.and.returnValue(of(dummyTypes));

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load expense types on init', () => {
        expect(expenseServiceSpy.getExpenseTypes).toHaveBeenCalled();
    });
});
