import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Expense, ExpenseKpi, ExpenseType, ApiResponse, PaginatedResponse } from '../models/expense.model';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class ExpenseService {

    private apiUrl = `${environment.apiUrl}/api/v1/expenses`;
    private typeApiUrl = `${environment.apiUrl}/api/v1/expense-types`;

    constructor(private http: HttpClient) { }

    // Expense Methods
    getExpenses(page: number = 0, size: number = 10): Observable<PaginatedResponse<Expense>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString())
            .set('sort', 'expenseDate,desc');
        return this.http.get<ApiResponse<PaginatedResponse<Expense>>>(this.apiUrl, { params }).pipe(map(res => res.data));
    }

    getExpense(id: number): Observable<Expense> {
        return this.http.get<ApiResponse<Expense>>(`${this.apiUrl}/${id}`).pipe(map(res => res.data));
    }

    createExpense(expense: Expense): Observable<Expense> {
        return this.http.post<ApiResponse<Expense>>(this.apiUrl, expense).pipe(map(res => res.data));
    }

    updateExpense(id: number, expense: Expense): Observable<Expense> {
        return this.http.put<ApiResponse<Expense>>(`${this.apiUrl}/${id}`, expense).pipe(map(res => res.data));
    }

    deleteExpense(id: number): Observable<boolean> {
        return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`).pipe(map(res => res.data));
    }

    getDashboardKpis(): Observable<ExpenseKpi[]> {
        return this.http.get<ApiResponse<ExpenseKpi[]>>(`${this.apiUrl}/dashboard-kpis`).pipe(map(res => res.data));
    }

    // Expense Type Methods
    getExpenseTypes(): Observable<ExpenseType[]> {
        return this.http.get<ApiResponse<ExpenseType[]>>(`${this.typeApiUrl}/all`).pipe(map(res => res.data));
    }

    getPaginatedExpenseTypes(page: number = 0, size: number = 10): Observable<PaginatedResponse<ExpenseType>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString())
            .set('sort', 'name,asc');
        return this.http.get<ApiResponse<PaginatedResponse<ExpenseType>>>(this.typeApiUrl, { params }).pipe(map(res => res.data));
    }

    getExpenseType(id: number): Observable<ExpenseType> {
        return this.http.get<ApiResponse<ExpenseType>>(`${this.typeApiUrl}/${id}`).pipe(map(res => res.data));
    }

    createExpenseType(type: ExpenseType): Observable<ExpenseType> {
        return this.http.post<ApiResponse<ExpenseType>>(this.typeApiUrl, type).pipe(map(res => res.data));
    }

    updateExpenseType(id: number, type: ExpenseType): Observable<ExpenseType> {
        return this.http.put<ApiResponse<ExpenseType>>(`${this.typeApiUrl}/${id}`, type).pipe(map(res => res.data));
    }

    deleteExpenseType(id: number): Observable<boolean> {
        return this.http.delete<ApiResponse<boolean>>(`${this.typeApiUrl}/${id}`).pipe(map(res => res.data));
    }
}
