export interface ExpenseType {
    id?: number;
    name: string;
    code: string;
    description?: string;
}

export interface Expense {
    id?: number;
    expenseTypeId: number;
    expenseTypeName?: string;
    amount: number;
    expenseDate: string; // ISO Date string
    description?: string;
    reference?: string;
}

export interface ExpenseKpi {
    startDate: string;
    endDate: string;
    totalAmount: number;
    periodLabel: string;
}

export interface ApiResponse<T> {
    statusCode: number;
    message: string;
    data: T;
    service: string;
    timestamp: string;
}

export interface PaginatedResponse<T> {
    content: T[];
    page: {
        number: number;
        size: number;
        totalElements: number;
        totalPages: number;
    };
}
