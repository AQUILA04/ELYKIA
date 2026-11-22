import { CashDepositRow, canCancelDeposit, depositCatchup, depositTontine, depositTotal, showCaptureHint, visibleDeposits } from './deposit-display';
import { operationLabel, operationTone } from './operation-types';

function row(values: Partial<CashDepositRow>): CashDepositRow {
    return { id: 1, date: '2026-11-19', commercialUsername: 'COM005', amount: 1000, ...values };
}

describe('deposit-display', () => {
    it('hides catch-up child lines already shown under a deposit of the period', () => {
        const parent = row({ id: 1 });
        const childOfPeriod = row({ id: 2, parentDepositId: 1, captureDate: '2026-11-19', date: '2026-11-17' });
        const childOfLaterDeposit = row({ id: 3, parentDepositId: 9, captureDate: '2026-11-21', date: '2026-11-18' });
        const visible = visibleDeposits([parent, childOfPeriod, childOfLaterDeposit], '2026-11-17', '2026-11-19');
        expect(visible.map(dep => dep.id)).toEqual([1, 3]);
    });

    it('adds catch-up allocations to the tontine and the physical total', () => {
        const dep = row({ amount: 500, tontineAmount: 200, physicalAmount: 900,
            catchupAllocations: [{ date: '2026-11-17', amount: 300 }, { date: '2026-11-18', amount: 100 }] });
        expect(depositTontine(dep)).toBe(600);
        expect(depositCatchup(dep)).toBe(400);
        expect(depositTotal(dep)).toBe(900);
        expect(depositTotal(row({ amount: 700 }))).toBe(700);
        expect(showCaptureHint(dep)).toBe(false);
        expect(showCaptureHint(row({ captureDate: '2026-11-20' }))).toBe(true);
    });

    it('lets a manager cancel within 3 days and an admin at any time, never twice', () => {
        const today = new Date(2026, 10, 19);
        const recent = row({ reference: 'DEP-1', captureDate: '2026-11-17' });
        const old = row({ reference: 'DEP-2', date: '2026-11-10' });
        expect(canCancelDeposit(recent, [recent], { isManager: true, isAdmin: false }, today)).toBe(true);
        expect(canCancelDeposit(old, [old], { isManager: true, isAdmin: false }, today)).toBe(false);
        expect(canCancelDeposit(old, [old], { isManager: false, isAdmin: true }, today)).toBe(true);
        const cancelled = row({ reference: 'CANCEL-DEP-1', amount: -1000 });
        expect(canCancelDeposit(recent, [recent, cancelled], { isManager: true, isAdmin: false }, today)).toBe(false);
        expect(canCancelDeposit(cancelled, [cancelled], { isManager: false, isAdmin: true }, today)).toBe(false);
        expect(canCancelDeposit(recent, [recent], { isManager: false, isAdmin: false }, today)).toBe(false);
    });

    it('labels operation types in French with a family tone', () => {
        expect(operationLabel('CREDIT_COLLECTION')).toBe('Recouvrement');
        expect(operationTone('CASH_DEPOSIT_CANCEL')).toBe('cancel');
        expect(operationLabel('UNKNOWN_TYPE')).toBe('UNKNOWN_TYPE');
        expect(operationTone(null)).toBe('stock');
    });
});
