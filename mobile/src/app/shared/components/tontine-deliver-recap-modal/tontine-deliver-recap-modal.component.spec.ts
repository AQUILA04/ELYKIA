import { TontineDeliverRecapItem, TontineDeliverRecapModalComponent } from './tontine-deliver-recap-modal.component';

describe('TontineDeliverRecapModalComponent', () => {
  let modalCtrl: { dismiss: jasmine.Spy };

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
    modalCtrl = { dismiss: jasmine.createSpy('dismiss').and.resolveTo(true) };
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
    expect(component.canConfirm).toBeTrue();

    component.confirm();
    expect(modalCtrl.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({ action: 'confirm', reduced: false, total: 30000 }));
  });

  it('blocks the delivery while an amount is still to pay and offers the top-up', () => {
    const component = create([item()], 20000);

    expect(component.balance.amountDue).toBe(10000);
    expect(component.canConfirm).toBeFalse();
    component.confirm();
    expect(modalCtrl.dismiss).not.toHaveBeenCalled();

    component.topUp();
    expect(modalCtrl.dismiss).toHaveBeenCalledWith({ action: 'topup', amount: 10000 });
  });

  it('unblocks the delivery once the order is reduced to the balance', () => {
    const component = create([item()], 20000);

    component.change(component.lines[0], -1);

    expect(component.total).toBe(15000);
    expect(component.balance.amountDue).toBe(0);
    expect(component.reduced).toBeTrue();
    expect(component.canConfirm).toBeTrue();
    component.confirm();
    expect(modalCtrl.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({ action: 'confirm', reduced: true, total: 15000 }));
  });

  it('never raises a line above the ordered quantity', () => {
    const component = create([item()], 40000);

    expect(component.canIncrease(component.lines[0])).toBeFalse();
    component.change(component.lines[0], 1);
    expect(component.lines[0].quantity).toBe(2);

    component.change(component.lines[0], -1);
    expect(component.canIncrease(component.lines[0])).toBeTrue();
    component.change(component.lines[0], 1);
    expect(component.lines[0].quantity).toBe(2);
    expect(component.reduced).toBeFalse();
  });

  it('removes a line brought to zero but keeps at least one article', () => {
    const component = create([item(), item({ id: 'i2', articleId: 'a2', quantity: 1, totalPrice: 5000 })], 40000);

    component.change(component.lines[1], -1);
    expect(component.lines.length).toBe(1);
    expect(component.reduced).toBeTrue();

    component.change(component.lines[0], -1);
    component.change(component.lines[0], -1);
    expect(component.lines.length).toBe(1);
  });

  it('blocks the delivery when the tontine stock does not cover a line', () => {
    const component = create([item({ stockAvailable: 1 })], 40000);

    expect(component.missingStock.length).toBe(1);
    expect(component.canConfirm).toBeFalse();

    component.change(component.lines[0], -1);
    expect(component.missingStock.length).toBe(0);
    expect(component.canConfirm).toBeTrue();
  });

  it('ignores the stock when it is unknown', () => {
    const component = create([item({ stockAvailable: null })], 40000);

    expect(component.missingStock.length).toBe(0);
    expect(component.canConfirm).toBeTrue();
  });
});
