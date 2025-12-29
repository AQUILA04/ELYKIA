import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseTypeListComponent } from './type-list.component';
import { ExpenseService } from '../../services/expense.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { PaginatedResponse, ExpenseType } from '../../models/expense.model';

describe('ExpenseTypeListComponent', () => {
    let component: ExpenseTypeListComponent;
    let fixture: ComponentFixture<ExpenseTypeListComponent>;
    let expenseServiceSpy: jasmine.SpyObj<ExpenseService>;

    beforeEach(async () => {
        const spy = jasmine.createSpyObj('ExpenseService', ['getPaginatedExpenseTypes', 'deleteExpenseType']);

        await TestBed.configureTestingModule({
            declarations: [ExpenseTypeListComponent],
            imports: [
                MatSnackBarModule,
                MatPaginatorModule,
                MatTableModule,
                MatIconModule,
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
        fixture = TestBed.createComponent(ExpenseTypeListComponent);
        component = fixture.componentInstance;

        const dummyResponse: PaginatedResponse<ExpenseType> = {
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 10,
            number: 0
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
