export const APPROVISIONNEMENT_EXPENSE_TYPE = 'Approvisionnement';

export function isSupplyExpense(typeName?: string | null): boolean {
    return (typeName || '').trim().toLowerCase() === APPROVISIONNEMENT_EXPENSE_TYPE.toLowerCase();
}

export function sumExpenseAmounts(
    expenses: ReadonlyArray<{ amount?: number | string | null; expenseTypeName?: string | null }>,
    options?: { excludeSupply?: boolean }
): number {
    return expenses.reduce((sum, expense) => {
        if (options?.excludeSupply && isSupplyExpense(expense.expenseTypeName)) {
            return sum;
        }
        const amount = Number(expense.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
}

export function cashDeskBalance(totalDeposited: number, expensesWithoutSupply: number): number {
    return (Number(totalDeposited) || 0) - (Number(expensesWithoutSupply) || 0);
}
