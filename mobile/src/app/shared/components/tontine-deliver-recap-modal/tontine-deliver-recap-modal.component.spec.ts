import type { Mock } from "vitest";
import { TontineDeliverRecapItem, TontineDeliverRecapModalComponent } from './tontine-deliver-recap-modal.component';

describe('TontineDeliverRecapModalComponent', () => {
    let modalCtrl: {
        dismiss: Mock;
    };

    const item = (overrides: Partial<TontineDeliverRecapItem> = {}): TontineDeliverRecapItem => ({
        id: 'i1',
        tontineDeliveryId: 'd1',
        articleId: 'a1',
        articleName: 'Riz 25 kg',
        quantity: 2,
        unitPrice: 15000,
        totalPrice: 30000,
        stockAvailable: 5,
        ...overrides
    });

    function create(items: TontineDeliverRecapItem[], netContribution: number): TontineDeliverRecapModalComponent {
        modalCtrl = { dismiss: vi.fn().mockResolvedValue(true) };
        const component = new TontineDeliverRecapModalComponent(modalCtrl as any);
        component.items = items;
        component.netContribution = netContribution;
        component.ngOnInit();
        return component;
    }

    it('allows the delivery when the balance covers the order and stock is enough', () => {
        const component = create([item()], 40000);

        expect(component.balance.amountDue).toBe(0);
        expect(component.balance.refundableBalance).toBe(10000);
        expect(component.canConfirm).toBe(true);

        component.confirm();
        expect(modalCtrl.dismiss).toHaveBeenCalledWith(expect.objectContaining({ action: 'confirm', reduced: false, total: 30000 }));
    });

    it('blocks the delivery while an amount is still to pay and offers the top-up', () => {
        const component = create([item()], 20000);

        expect(component.balance.amountDue).toBe(10000);
        expect(component.canConfirm).toBe(false);
        component.confirm();
        expect(modalCtrl.dismiss).not.toHaveBeenCalled();

        component.topUp();
        expect(modalCtrl.dismiss).toHaveBeenCalledWith(expect.objectContaining({ action: 'topup', amount: 10000, reduced: false }));
    });

    it('unblocks the delivery once the order is reduced to the balance', () => {
        const component = create([item()], 20000);

        component.change(component.lines[0], -1);

        expect(component.total).toBe(15000);
        expect(component.balance.amountDue).toBe(0);
        expect(component.reduced).toBe(true);
        expect(component.canConfirm).toBe(true);
        component.confirm();
        expect(modalCtrl.dismiss).toHaveBeenCalledWith(expect.objectContaining({ action: 'confirm', reduced: true, total: 15000 }));
    });

    it('raises a line above the ordered quantity only while the tontine stock covers it', () => {
        const component = create([item({ stockAvailable: 3 })], 60000);

        expect(component.canIncrease(component.lines[0])).toBe(true);
        component.change(component.lines[0], 1);
        expect(component.lines[0].quantity).toBe(3);
        expect(component.reduced).toBe(true);
        expect(component.canIncrease(component.lines[0])).toBe(false);
        component.change(component.lines[0], 1);
        expect(component.lines[0].quantity).toBe(3);
    });

    it('adds a picked stock article as a new line and marks the order as changed', () => {
        const component = create([item()], 60000);
        component.tontineDeliveryId = 'd1';

        component.applyPick({ articleId: 'a2', articleName: 'Huile 5 L', unitPrice: 6000, stockAvailable: 4 });
        expect(component.lines.length).toBe(2);
        expect(component.lines[1]).toEqual(expect.objectContaining({ articleId: 'a2', quantity: 1, totalPrice: 6000, stockAvailable: 4 }));
        expect(component.total).toBe(36000);
        expect(component.reduced).toBe(true);

        component.applyPick({ articleId: 'a2', articleName: 'Huile 5 L', unitPrice: 6000, stockAvailable: 4 });
        expect(component.lines.length).toBe(2);
        expect(component.lines[1].quantity).toBe(2);
    });

    it('blocks the delivery above the order ceiling even when the balance covers it', () => {
        const component = create([item()], 100000);
        component.ceiling = 25000;

        expect(component.ceilingExcess).toBe(5000);
        expect(component.canConfirm).toBe(false);
        component.change(component.lines[0], -1);
        expect(component.ceilingExcess).toBe(0);
        expect(component.canConfirm).toBe(true);
    });

    it('never raises a line above the ordered quantity when the stock is unknown', () => {
        const component = create([item({ stockAvailable: null })], 40000);

        expect(component.canIncrease(component.lines[0])).toBe(false);
        component.change(component.lines[0], 1);
        expect(component.lines[0].quantity).toBe(2);

        component.change(component.lines[0], -1);
        expect(component.canIncrease(component.lines[0])).toBe(true);
        component.change(component.lines[0], 1);
        expect(component.lines[0].quantity).toBe(2);
        expect(component.reduced).toBe(false);
    });

    it('removes a line brought to zero but keeps at least one article', () => {
        const component = create([item(), item({ id: 'i2', articleId: 'a2', quantity: 1, totalPrice: 5000 })], 40000);

        component.change(component.lines[1], -1);
        expect(component.lines.length).toBe(1);
        expect(component.reduced).toBe(true);

        component.change(component.lines[0], -1);
        component.change(component.lines[0], -1);
        expect(component.lines.length).toBe(1);
    });

    it('blocks the delivery when the tontine stock does not cover a line', () => {
        const component = create([item({ stockAvailable: 1 })], 40000);

        expect(component.missingStock.length).toBe(1);
        expect(component.canConfirm).toBe(false);

        component.change(component.lines[0], -1);
        expect(component.missingStock.length).toBe(0);
        expect(component.canConfirm).toBe(true);
    });

    it('ignores the stock when it is unknown', () => {
        const component = create([item({ stockAvailable: null })], 40000);

        expect(component.missingStock.length).toBe(0);
        expect(component.canConfirm).toBe(true);
    });
});
