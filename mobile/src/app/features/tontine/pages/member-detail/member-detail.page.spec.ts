import { of } from 'rxjs';
import { MemberDetailPage } from './member-detail.page';

describe('MemberDetailPage delivery menu', () => {
  function create(options?: {
    routeId?: string;
    deliveries?: any[];
    members?: any[];
    deliveryError?: boolean;
  }) {
    const routeId = options?.routeId ?? 'm2';
    const deliveryRepo = {
      getByMemberAndCommercial: jasmine.createSpy('getByMemberAndCommercial').and.callFake(() => {
        if (options?.deliveryError) {
          return Promise.reject(new Error('db'));
        }
        return Promise.resolve(options?.deliveries ?? []);
      })
    };
    const alertCtrl = {
      create: jasmine.createSpy('create').and.resolveTo({ present: () => Promise.resolve() })
    };
    const navCtrl = { back: jasmine.createSpy('back'), navigateForward: jasmine.createSpy('navigateForward') };
    const page = new MemberDetailPage(
      {
        snapshot: { paramMap: { get: (key: string) => key === 'id' ? routeId : null } },
        paramMap: of({ get: () => routeId })
      } as any,
      navCtrl as any,
      alertCtrl as any,
      {} as any,
      {} as any,
      {} as any,
      { select: () => of(null), dispatch: jasmine.createSpy('dispatch') } as any,
      { getSession: () => of(null) } as any,
      {
        findAll: jasmine.createSpy('findAll').and.resolveTo(options?.members ?? [{
          id: routeId,
          clientId: 'c1',
          deliveryStatus: 'SESSION_INPROGRESS'
        }])
      } as any,
      { getByMemberId: jasmine.createSpy('getByMemberId').and.resolveTo([]) } as any,
      { findById: jasmine.createSpy('findById').and.resolveTo(null) } as any,
      deliveryRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    (page as any).commercialUsername = 'com1';
    return { page, deliveryRepo };
  }

  it('shows Commande de tontine while the session is active and the member has no delivery', async () => {
    const { page, deliveryRepo } = create();
    page.vm.delivery = { id: 'from-other-member', status: 'PENDING', tontineMemberId: 'm1' } as any;
    page.vm.deliveryItems = [{ id: 'item' } as any];
    (page as any).memberId = 'm1';

    await page.loadMemberData();

    expect(deliveryRepo.getByMemberAndCommercial).toHaveBeenCalledWith('m2', 'com1');
    expect(page.vm.delivery).toBeNull();
    expect(page.vm.deliveryItems).toEqual([]);
    page.sessionStatus = 'ACTIVE';
    expect(page.deliveryCreationMenuLabel()).toBe('Commande de tontine');
    expect(page.canOpenDeliveryCreation()).toBeTrue();
  });

  it('keeps Livraison Fin d\'Année when the session is closed', async () => {
    const { page } = create();
    await page.loadMemberData();
    page.sessionStatus = 'closed';
    expect(page.deliveryCreationMenuLabel()).toBe('Livraison Fin d\'Année');
    expect(page.canOpenDeliveryCreation()).toBeTrue();
    expect(page.canRecordNormalCollection()).toBeFalse();
  });

  it('hides the entry when the session status is unknown or ended', async () => {
    const { page } = create();
    await page.loadMemberData();
    page.sessionStatus = null;
    expect(page.canOpenDeliveryCreation()).toBeFalse();
    expect(page.canRecordNormalCollection()).toBeFalse();
    page.sessionStatus = 'ENDED';
    expect(page.deliveryCreationMenuLabel()).toBeNull();
    expect(page.canOpenDeliveryCreation()).toBeFalse();
    expect(page.canRecordNormalCollection()).toBeFalse();
  });

  it('offers Cotiser only while the session is ACTIVE', async () => {
    const { page } = create();
    await page.loadMemberData();
    page.sessionStatus = 'ACTIVE';
    expect(page.canRecordNormalCollection()).toBeTrue();
  });

  it('offers Modifier la commande while a pending order exists', async () => {
    const { page } = create({
      deliveries: [{ id: 'order', status: 'PENDING', requestDate: '2026-04-01', items: [{ id: 'i1', quantity: 1 }] }]
    });
    await page.loadMemberData();
    page.sessionStatus = 'CLOSED';
    expect(page.hasPendingDeliveryToMark()).toBeTrue();
    expect(page.canEditPendingOrder()).toBeTrue();
    page.revisingOrder = true;
    expect(page.canEditPendingOrder()).toBeFalse();
  });

  it('does not offer Modifier la commande when the order has no items to edit', async () => {
    const { page } = create({
      deliveries: [{ id: 'order', status: 'PENDING', requestDate: '2026-04-01', items: [] }]
    });
    await page.loadMemberData();
    page.sessionStatus = 'CLOSED';
    expect(page.hasPendingDeliveryToMark()).toBeTrue();
    expect(page.canEditPendingOrder()).toBeFalse();
  });

  it('ignores delivery rows without id after closure and shows À livrer', async () => {
    const { page } = create({
      members: [{ id: 'm2', clientId: 'c1', deliveryStatus: 'PENDING' }],
      deliveries: [
        { id: null, status: 'PENDING', requestDate: null, items: [] },
        { id: 'null', status: 'PENDING', requestDate: null, items: [] }
      ]
    });
    await page.loadMemberData();
    page.sessionStatus = 'CLOSED';
    expect(page.vm.delivery).toBeNull();
    expect(page.canEditPendingOrder()).toBeFalse();
    expect(page.memberStatusLabel()).toBe('À livrer');
    expect(page.deliveryCreationMenuLabel()).toBe('Livraison Fin d\'Année');
    expect(page.canOpenDeliveryCreation()).toBeTrue();
  });

  it('shows the order status in the header when the member has a real order', async () => {
    const { page } = create({
      members: [{ id: 'm2', clientId: 'c1', deliveryStatus: 'PENDING' }],
      deliveries: [{ id: '4', status: 'PENDING', requestDate: '2026-11-20', items: [{ id: 'i1', quantity: 2 }] }]
    });
    await page.loadMemberData();
    expect(page.memberStatusLabel()).toBe('Commande');
  });

  it('hides the entry when a non-cancelled delivery exists', async () => {
    const { page } = create({
      deliveries: [{ id: 'order', status: 'PENDING', requestDate: '2026-04-01', items: [] }]
    });
    await page.loadMemberData();
    page.sessionStatus = 'ACTIVE';
    expect(page.vm.delivery?.id).toBe('order');
    expect(page.canOpenDeliveryCreation()).toBeFalse();
  });

  it('ignores a cancelled delivery', async () => {
    const { page } = create({
      deliveries: [{ id: 'gone', status: 'CANCELLED', requestDate: '2026-01-01', items: [{ id: 'i' }] }]
    });
    await page.loadMemberData();
    page.sessionStatus = 'ACTIVE';
    expect(page.vm.delivery).toBeNull();
    expect(page.canOpenDeliveryCreation()).toBeTrue();
  });

  it('treats a status-less synced row as an order when the member status says so', async () => {
    const { page } = create({
      members: [{ id: 'm2', clientId: 'c1', deliveryStatus: 'PENDING' }],
      deliveries: [{ id: 'd1', status: null, requestDate: '2026-05-01', items: [] }]
    });
    await page.loadMemberData();
    page.sessionStatus = 'ACTIVE';
    expect(page.vm.delivery?.status).toBe('PENDING');
    expect(page.canOpenDeliveryCreation()).toBeFalse();
  });

  it('ignores a status-less row when the member has no order', async () => {
    const { page } = create({
      deliveries: [{ id: 'ghost', status: null, requestDate: '2026-05-01' }]
    });
    await page.loadMemberData();
    page.sessionStatus = 'active';
    expect(page.vm.delivery).toBeNull();
    expect(page.deliveryCreationMenuLabel()).toBe('Commande de tontine');
    expect(page.canOpenDeliveryCreation()).toBeTrue();
  });

  it('hides the entry when the delivery lookup fails', async () => {
    const { page } = create({ deliveryError: true });
    await page.loadMemberData();
    page.sessionStatus = 'ACTIVE';
    expect(page.vm.delivery).toBeNull();
    expect(page.canOpenDeliveryCreation()).toBeFalse();
  });

  it('hides the entry until the commercial username is known', async () => {
    const { page, deliveryRepo } = create();
    (page as any).commercialUsername = null;
    await page.loadMemberData();
    page.sessionStatus = 'ACTIVE';
    expect(deliveryRepo.getByMemberAndCommercial).not.toHaveBeenCalled();
    expect(page.canOpenDeliveryCreation()).toBeFalse();
  });
});
