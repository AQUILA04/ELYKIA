import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseTypeFormComponent } from './type-form.component';
import { ExpenseService } from '../../services/expense.service';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

describe('ExpenseTypeFormComponent', () => {
    let component: ExpenseTypeFormComponent;
    let fixture: ComponentFixture<ExpenseTypeFormComponent>;
    let expenseServiceSpy: jasmine.SpyObj<ExpenseService>;

    beforeEach(async () => {
        const spy = jasmine.createSpyObj('ExpenseService', ['createExpenseType', 'updateExpenseType', 'getExpenseType']);

        await TestBed.configureTestingModule({
            declarations: [ExpenseTypeFormComponent],
            imports: [
                ReactiveFormsModule,
                FormsModule,
                MatSnackBarModule,
                MatFormFieldModule,
                MatInputModule,
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
        fixture = TestBed.createComponent(ExpenseTypeFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
