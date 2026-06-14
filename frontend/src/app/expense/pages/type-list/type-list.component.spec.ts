import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseTypeListComponent } from './type-list.component';
import { ExpenseService } from '../../services/expense.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { PaginatedResponse, ExpenseType } from '../../models/expense.model';
import { AlertService } from 'src/app/shared/service/alert.service';

describe('ExpenseTypeListComponent', () => {
    let component: ExpenseTypeListComponent;
    let fixture: ComponentFixture<ExpenseTypeListComponent>;
    let expenseServiceSpy: jasmine.SpyObj<ExpenseService>;

    beforeEach(async () => {
        const spy = jasmine.createSpyObj('ExpenseService', ['getPaginatedExpenseTypes', 'deleteExpenseType']);
        const alertSpy = jasmine.createSpyObj('AlertService', ['showConfirmation']);

        await TestBed.configureTestingModule({
            declarations: [ExpenseTypeListComponent],
            imports: [
                MatSnackBarModule,
                RouterTestingModule
            ],
            providers: [
                { provide: ExpenseService, useValue: spy },
                { provide: AlertService, useValue: alertSpy }
            ]
        })
            .compileComponents();

        expenseServiceSpy = TestBed.inject(ExpenseService) as jasmine.SpyObj<ExpenseService>;
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
        expenseServiceSpy.getPaginatedExpenseTypes.and.returnValue(of(dummyResponse));

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load types on init', () => {
        expect(expenseServiceSpy.getPaginatedExpenseTypes).toHaveBeenCalledWith(0, 10);
    });
});
