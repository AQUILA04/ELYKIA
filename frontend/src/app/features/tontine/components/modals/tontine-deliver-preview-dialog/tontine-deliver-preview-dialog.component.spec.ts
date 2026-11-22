import { TontineDeliverPreviewData, TontineDeliverPreviewDialogComponent } from './tontine-deliver-preview-dialog.component';

describe('TontineDeliverPreviewDialogComponent', () => {
    function create(data: Partial<TontineDeliverPreviewData>) {
        const dialogRef = { close: vi.fn() };
        const component = new TontineDeliverPreviewDialogComponent(dialogRef as any, {
            clientName: 'Ama KOFFI',
            items: [{ id: 1, deliveryId: 1, articleId: 1, articleName: 'Riz', quantity: 2, unitPrice: 15000, totalPrice: 30000 }],
            totalAmount: 30000,
            netContribution: 40000,
            ...data
        });
        return { component, dialogRef };
    }

    it('shows the balance to refund and lets the delivery be confirmed', () => {
        const { component, dialogRef } = create({});

        expect(component.amountDue).toBe(0);
        expect(component.refundableBalance).toBe(10000);
        expect(component.canConfirm).toBe(true);
        component.confirm();
        expect(dialogRef.close).toHaveBeenCalledWith('confirm');
    });

    it('blocks the confirmation while an amount is still to pay', () => {
        const { component, dialogRef } = create({ netContribution: 20000 });

        expect(component.amountDue).toBe(10000);
        expect(component.canConfirm).toBe(false);
        component.confirm();
        expect(dialogRef.close).not.toHaveBeenCalled();

        component.reduce();
        expect(dialogRef.close).toHaveBeenCalledWith('reduce');
    });

    it('refuses to confirm an empty order', () => {
        const { component } = create({ items: [], totalAmount: 0 });

        expect(component.canConfirm).toBe(false);
    });
});
