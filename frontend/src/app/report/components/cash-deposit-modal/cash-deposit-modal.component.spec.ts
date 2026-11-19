import { of } from 'rxjs';
import { CashDepositModalComponent } from './cash-deposit-modal.component';

describe('CashDepositModalComponent (répartition)', () => {
    let createDeposit: jasmine.Spy;

    function modal(): CashDepositModalComponent {
        createDeposit = jasmine.createSpy('createDeposit').and.returnValue(of({}));
        const component = new CashDepositModalComponent(
            { close: jasmine.createSpy('close') } as any,
            {
                commercialUsername: 'COM005',
                remainingAmount: 0,
                remainingCredit: 300,
                remainingTontine: 500,
                remainingNewBalance: 0,
                date: '2026-11-19',
                catchupCaps: [
                    { collectionDate: '2026-11-17', capturedAmount: 400, openRemaining: 400 },
                    { collectionDate: '2026-11-18', capturedAmount: 600, openRemaining: 600 }
                ]
            },
            { createDeposit } as any,
            { open: jasmine.createSpy('open') } as any
        );
        return component;
    }

    function billetage(component: CashDepositModalComponent, total: number): void {
        component.onBilletageChange({ totalAmount: total, ticketingData: {} });
    }

    it('shows the remaining catch-ups as the sum of the date caps', () => {
        expect(modal().catchupTotal).toBe(1000);
    });

    it('fills credit, today tontine, then catch-ups oldest first, then surplus', () => {
        const component = modal();
        billetage(component, 2000);
        expect(component.creditAmount).toBe(300);
        expect(component.tontineAmount).toBe(500);
        expect(component.catchupAmount).toBe(1000);
        expect(component.surplusAmount).toBe(200);
        expect(component.catchupLines).toEqual([
            { collectionDate: '2026-11-17', amount: 400 },
            { collectionDate: '2026-11-18', amount: 600 }
        ]);
        expect(component.allocationMismatch).toBeFalse();
    });

    it('gives nothing to catch-ups when the billetage does not cover the day', () => {
        const component = modal();
        billetage(component, 600);
        expect(component.creditAmount).toBe(300);
        expect(component.tontineAmount).toBe(300);
        expect(component.catchupAmount).toBe(0);
    });

    it('reserves a manual catch-up first and keeps it when the billetage changes', () => {
        const component = modal();
        billetage(component, 600);
        component.catchupAmount = 500;
        component.onCategoryChange('catchup');
        billetage(component, 700);
        expect(component.catchupAmount).toBe(500);
        expect(component.creditAmount).toBe(200);
        expect(component.tontineAmount).toBe(0);
        expect(component.catchupLines[0].amount).toBe(400);
        expect(component.catchupLines[1].amount).toBe(100);
        expect(component.allocationMismatch).toBeFalse();
    });

    it('flags a catch-up above what is owed and blocks the submit', () => {
        const component = modal();
        billetage(component, 3000);
        component.catchupAmount = 1500;
        component.onCategoryChange('catchup');
        expect(component.catchupExceeded).toBeTrue();
        component.submitDeposit();
        expect(createDeposit).not.toHaveBeenCalled();
    });

    it('sends the catch-up amount with the deposit', () => {
        const component = modal();
        billetage(component, 1800);
        component.submitDeposit();
        expect(createDeposit).toHaveBeenCalledWith(jasmine.objectContaining({
            amount: 1800, creditAmount: 300, tontineAmount: 500, catchupAmount: 1000, surplusAmount: 0
        }));
    });
});
