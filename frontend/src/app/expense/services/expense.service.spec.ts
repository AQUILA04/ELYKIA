import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ExpenseService } from './expense.service';
import { environment } from 'src/environments/environment';
import { Expense, ExpenseType, ApiResponse, PaginatedResponse } from '../models/expense.model';

describe('ExpenseService', () => {
    let service: ExpenseService;
    let httpMock: HttpTestingController;
    const apiUrl = `${environment.apiUrl}/api/v1/expenses`;
    const typeApiUrl = `${environment.apiUrl}/api/v1/expense-types`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [ExpenseService]
        });
        service = TestBed.inject(ExpenseService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Expense Methods', () => {
        it('getExpenses should return paginated expenses', () => {
            const dummyResponse: ApiResponse<PaginatedResponse<Expense>> = {
                statusCode: 200,
                message: 'Success',
                service: 'EXPENSE-SERVICE',
                timestamp: new Date().toISOString(),
                data: {
                    content: [],
                    totalElements: 0,
                    totalPages: 0,
                    size: 10,
                    number: 0
                }
            };

            service.getExpenses(0, 10).subscribe(response => {
                expect(response).toEqual(dummyResponse.data);
            });

            const req = httpMock.expectOne(req => req.url === apiUrl && req.params.has('page') && req.params.has('size'));
            expect(req.request.method).toBe('GET');
            req.flush(dummyResponse);
        });

        it('createExpense should POST and return new expense', () => {
            const newExpense: Expense = { amount: 100, description: 'Test', expenseDate: '2023-01-01', expenseTypeId: 1 };
            const dummyResponse: ApiResponse<Expense> = {
                statusCode: 200,
                message: 'Success',
                service: 'EXPENSE-SERVICE',
                timestamp: new Date().toISOString(),
                data: { id: 1, ...newExpense }
            };

            service.createExpense(newExpense).subscribe(response => {
                expect(response).toEqual(dummyResponse.data);
            });

            const req = httpMock.expectOne(apiUrl);
            expect(req.request.method).toBe('POST');
            req.flush(dummyResponse);
        });
    });

    describe('ExpenseType Methods', () => {
        it('getExpenseTypes should return list of types', () => {
            const dummyTypes: ExpenseType[] = [{ id: 1, name: 'Type 1', code: 'T1' }, { id: 2, name: 'Type 2', code: 'T2' }];
            const dummyResponse: ApiResponse<ExpenseType[]> = {
                statusCode: 200,
                message: 'Success',
                service: 'EXPENSE-SERVICE',
                timestamp: new Date().toISOString(),
                data: dummyTypes
            };

            service.getExpenseTypes().subscribe(types => {
                expect(types.length).toBe(2);
                expect(types).toEqual(dummyTypes);
            });

            const req = httpMock.expectOne(`${typeApiUrl}/all`);
            expect(req.request.method).toBe('GET');
            req.flush(dummyResponse);
        });

        it('createExpenseType should POST and return new type', () => {
            const newType: ExpenseType = { name: 'New Type', code: 'NT' };
            const dummyResponse: ApiResponse<ExpenseType> = {
                statusCode: 200,
                message: 'Success',
                service: 'EXPENSE-SERVICE',
                timestamp: new Date().toISOString(),
                data: { id: 1, ...newType }
            };

            service.createExpenseType(newType).subscribe(response => {
                expect(response).toEqual(dummyResponse.data);
            });

            const req = httpMock.expectOne(typeApiUrl);
            expect(req.request.method).toBe('POST');
            req.flush(dummyResponse);
        });
    });
});
