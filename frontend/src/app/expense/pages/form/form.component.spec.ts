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
