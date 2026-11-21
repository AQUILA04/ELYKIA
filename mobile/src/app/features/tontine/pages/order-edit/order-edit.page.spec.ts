import { of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { OrderEditPage } from './order-edit.page';
import { TontineOrderEditOutcomeService } from './tontine-order-edit-outcome.service';

describe('OrderEditPage', () => {
  const member = { id: 'm2', clientId: 'c1', deliveryStatus: 'PENDING', availableContribution: 25500 };
  const order = {
    id: '5', status: 'PENDING', reference: 'LIV-A', requestDate: '2026-11-21', totalAmount: 12800,
    items: [{ id: 'i1', tontineDeliveryId: '5', articleId: 'a1', articleName: 'Riz', quantity: 4, unitPrice: 3200, totalPrice: 12800 }]
  };

  function create(options: { ceiling?: number; replace?: () => Promise<number>; deliveries?: any[]; members?: any[] } = {}) {
    const loading = {
      present: jasmine.createSpy('present').and.resolveTo(),
      dismiss: jasmine.createSpy('dismiss').and.resolveTo(true)
    };
    const loadingCtrl = { create: jasmine.createSpy('create').and.resolveTo(loading) };
    const navCtrl = { back: jasmine.createSpy('back') };
    const feedback = {
      error: jasmine.createSpy('error').and.resolveTo('ok'),
      warning: jasmine.createSpy('warning').and.resolveTo('ok'),
      success: jasmine.createSpy('success').and.resolveTo('close'),
      confirm: jasmine.createSpy('confirm').and.resolveTo(false)
    };
    const writeService = {
      replaceDeliveryItems: jasmine.createSpy('replaceDeliveryItems').and.callFake(options.replace ?? (() => Promise.resolve(16000)))
    };
    const outcome = new TontineOrderEditOutcomeService();
    const page = new OrderEditPage(
      { snapshot: { paramMap: { get: () => 'm2' } } } as any,
      navCtrl as any,
      loadingCtrl as any,
      {} as any,
      { select: () => of({ username: 'com1', id: 'sess', status: 'CLOSED' }) } as any,
      { findAll: () => Promise.resolve(options.members ?? [member]) } as any,
      { getByMemberId: () => Promise.resolve([]) } as any,
      { findById: () => Promise.resolve({ fullName: 'Ama KOFFI' }) } as any,
      {
        getByMemberAndCommercial: () => Promise.resolve((options.deliveries ?? [order]).map(d => ({ ...d, items: d.items.map((i: any) => ({ ...i })) }))),
        getServerId: () => Promise.resolve(null)
      } as any,
      writeService as any,
      feedback as any,
      { forMember: () => Promise.resolve({ ceiling: options.ceiling ?? 1_000_000, projected: 0, available: 0 }) } as any,
      outcome
    );
    return { page, loading, navCtrl, feedback, writeService, outcome };
  }

  it('loads the pending order with its ceiling and keeps Save disabled until something changes', async () => {
    const { page } = create({ ceiling: 25500 });
    await page.ngOnInit();

    expect(page.clientName).toBe('Ama KOFFI');
    expect(page.lines.length).toBe(1);
    expect(page.ceiling?.ceiling).toBe(25500);
    expect(page.canSave).toBeFalse();

    page.change(page.lines[0], 1);
    expect(page.total).toBe(16000);
    expect(page.canSave).toBeTrue();
  });

  it('blocks a total above the ceiling and never calls the server', async () => {
    const { page, writeService, feedback } = create({ ceiling: 25500 });
    await page.ngOnInit();
    page.applyPick({ articleId: 'a2', articleName: 'Huile 25 L', unitPrice: 24000, stockAvailable: 10 });

    expect(page.ceilingExcess).toBe(11300);
    expect(page.canSave).toBeFalse();
    await page.save();

    expect(writeService.replaceDeliveryItems).not.toHaveBeenCalled();
    expect(feedback.error.calls.mostRecent().args[0]).toContain('plafond de ce membre (25 500 FCFA) de 11 300 FCFA');
  });

  it('closes the loading before the success window, then goes back and asks for the receipt', async () => {
    const { page, loading, feedback, navCtrl, outcome } = create();
    await page.ngOnInit();
    page.change(page.lines[0], 1);
    feedback.success.and.callFake(async () => {
      expect(loading.dismiss).toHaveBeenCalled();
      return 'receipt';
    });

    await page.save();

    expect(navCtrl.back).toHaveBeenCalled();
    expect(outcome.consumeReceiptRequest('m2')).toBeTrue();
    expect(outcome.consumeReceiptRequest('m2')).toBeFalse();
  });

  it('shows the backend message and stays on the page when the server refuses', async () => {
    const refused = new HttpErrorResponse({
      status: 400, statusText: 'OK', url: 'https://x/api/v1/tontines/deliveries/5/items',
      error: { message: 'La commande (62 300 FCFA) dépasse le plafond.' }
    });
    const { page, feedback, loading, navCtrl } = create({ replace: () => Promise.reject(refused) });
    await page.ngOnInit();
    page.change(page.lines[0], 1);

    await page.save();

    expect(loading.dismiss).toHaveBeenCalled();
    expect(feedback.error.calls.mostRecent().args[0]).toBe(refused);
    expect(navCtrl.back).not.toHaveBeenCalled();
    expect(page.saving).toBeFalse();
  });

  it('asks before abandoning unsaved changes', async () => {
    const { page, feedback, navCtrl } = create();
    await page.ngOnInit();
    page.change(page.lines[0], 1);

    await page.cancel();
    expect(feedback.confirm).toHaveBeenCalled();
    expect(navCtrl.back).not.toHaveBeenCalled();

    feedback.confirm.and.resolveTo(true);
    await page.cancel();
    expect(navCtrl.back).toHaveBeenCalled();
  });

  it('refuses to edit an order already delivered', async () => {
    const { page } = create({ members: [{ ...member, deliveryStatus: 'DELIVERED' }], deliveries: [{ ...order, status: 'DELIVERED' }] });
    await page.ngOnInit();

    expect(page.unavailableReason).toContain('déjà livrée');
    expect(page.canSave).toBeFalse();
  });
});
