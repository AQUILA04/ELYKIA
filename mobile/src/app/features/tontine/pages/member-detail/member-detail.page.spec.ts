import { of } from 'rxjs';
import { MemberDetailPage } from './member-detail.page';
import { TontineOrderEditOutcomeService } from '../order-edit/tontine-order-edit-outcome.service';

describe('MemberDetailPage delivery menu', () => {
    function create(options?: {
        routeId?: string;
        deliveries?: any[];
        members?: any[];
        deliveryError?: boolean;
        modalResult?: unknown;
        stockQuantity?: number | null;
        ceiling?: number;
        replaceError?: unknown;
    }) {
        const feedback = {
            error: vi.fn().mockResolvedValue('ok'),
            warning: vi.fn().mockResolvedValue('ok'),
            success: vi.fn().mockResolvedValue('close')
        };
        const ceilingService = {
            forMember: vi.fn().mockImplementation(async () => ({
                ceiling: options?.ceiling ?? 1000000, projected: options?.ceiling ?? 1000000, available: 0
            }))
        };
        const modalCtrl = {
            create: vi.fn().mockImplementation(async () => ({
                present: () => Promise.resolve(),
                onDidDismiss: () => Promise.resolve({ data: options?.modalResult })
            }))
        };
        const stockRepo = {
            getByArticle: vi.fn().mockResolvedValue(options?.stockQuantity === null ? null : { id: 's1', availableQuantity: options?.stockQuantity ?? 10 })
        };
        const writeService = {
            replaceDeliveryItems: options?.replaceError
                ? vi.fn().mockRejectedValue(options.replaceError)
                : vi.fn().mockResolvedValue(15000)
        };
        const loading = {
            present: vi.fn().mockResolvedValue(undefined),
            dismiss: vi.fn().mockResolvedValue(true)
        };
        const loadingCtrl = {
            create: vi.fn().mockResolvedValue(loading),
            getTop: vi.fn().mockResolvedValue(undefined)
        };
        const routeId = options?.routeId ?? 'm2';
        const deliveryRepo = {
            getByMemberAndCommercial: vi.fn().mockImplementation(() => {
                if (options?.deliveryError) {
                    return Promise.reject(new Error('db'));
                }
                return Promise.resolve(options?.deliveries ?? []);
            })
        };
        const alertCtrl = {
            create: vi.fn().mockResolvedValue({ present: () => Promise.resolve() })
        };
        const navCtrl = { back: vi.fn(), navigateForward: vi.fn() };
        const orderEditOutcome = new TontineOrderEditOutcomeService();
        const page = new MemberDetailPage({
            snapshot: { paramMap: { get: (key: string) => key === 'id' ? routeId : null } },
            paramMap: of({ get: () => routeId })
        } as any, navCtrl as any, alertCtrl as any, {} as any, {} as any, loadingCtrl as any, { select: () => of({ id: 'sess', year: 2026 }), dispatch: vi.fn() } as any, { getSession: () => of(null), refreshSessionFromServerIfOnline: () => Promise.resolve() } as any, {
            findAll: vi.fn().mockResolvedValue(options?.members ?? [{
                    id: routeId,
                    clientId: 'c1',
                    deliveryStatus: 'SESSION_INPROGRESS'
                }])
        } as any, { getByMemberId: vi.fn().mockResolvedValue([]) } as any, { findById: vi.fn().mockResolvedValue(null) } as any, deliveryRepo as any, {} as any, stockRepo as any, writeService as any, {} as any, {} as any, modalCtrl as any, feedback as any, ceilingService as any, orderEditOutcome);
        (page as any).commercialUsername = 'com1';
        return { page, deliveryRepo, modalCtrl, stockRepo, writeService, navCtrl, feedback, loading, orderEditOutcome };
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
        expect(page.canOpenDeliveryCreation()).toBe(true);
    });

    it('keeps Livraison Fin d\'Année when the session is closed', async () => {
        const { page } = create();
        await page.loadMemberData();
        page.sessionStatus = 'closed';
        expect(page.deliveryCreationMenuLabel()).toBe('Livraison Fin d\'Année');
        expect(page.canOpenDeliveryCreation()).toBe(true);
        expect(page.canRecordNormalCollection()).toBe(false);
    });

    it('hides the entry when the session status is unknown or ended', async () => {
        const { page } = create();
        await page.loadMemberData();
        page.sessionStatus = null;
        expect(page.canOpenDeliveryCreation()).toBe(false);
        expect(page.canRecordNormalCollection()).toBe(false);
        page.sessionStatus = 'ENDED';
        expect(page.deliveryCreationMenuLabel()).toBeNull();
        expect(page.canOpenDeliveryCreation()).toBe(false);
        expect(page.canRecordNormalCollection()).toBe(false);
    });

    it('offers Cotiser only while the session is ACTIVE', async () => {
        const { page } = create();
        await page.loadMemberData();
        page.sessionStatus = 'ACTIVE';
        expect(page.canRecordNormalCollection()).toBe(true);
    });

    it('offers Modifier la commande while a pending order exists', async () => {
        const { page } = create({
            deliveries: [{ id: 'order', status: 'PENDING', requestDate: '2026-04-01', items: [{ id: 'i1', quantity: 1 }] }]
        });
        await page.loadMemberData();
        page.sessionStatus = 'CLOSED';
        expect(page.hasPendingDeliveryToMark()).toBe(true);
        expect(page.canEditPendingOrder()).toBe(true);
    });

    it('no longer offers Marquer comme livré once the member is delivered', async () => {
        const { page } = create({
            members: [{ id: 'm2', clientId: 'c1', deliveryStatus: 'DELIVERED' }],
            deliveries: [
                { id: 'local-uuid', status: 'PENDING', requestDate: '2026-04-01', items: [{ id: 'i1', quantity: 1 }] },
                { id: '42', status: 'DELIVERED', requestDate: '2026-04-01', items: [{ id: 'i2', quantity: 1 }] }
            ]
        });
        await page.loadMemberData();
        page.sessionStatus = 'CLOSED';
        expect(page.vm.delivery?.id).toBe('42');
        expect(page.hasPendingDeliveryToMark()).toBe(false);
        expect(page.canMarkAsDelivered()).toBe(false);
        expect(page.canEditPendingOrder()).toBe(false);
    });

    describe('Livrer', () => {
        const order = { id: '42', status: 'VALIDATED', requestDate: '2026-04-01', totalAmount: 30000, reference: 'LIV-A',
            items: [{ id: 'i1', articleId: 'a1', articleName: 'Riz', quantity: 2, unitPrice: 15000, totalPrice: 30000 }] };
        const member = { id: 'm2', clientId: 'c1', deliveryStatus: 'VALIDATED', availableContribution: 20000 };

        it('opens the recap with the net balance and the tontine stock of each article', async () => {
            const { page, modalCtrl } = create({ members: [member], deliveries: [order], modalResult: { action: 'cancel' }, stockQuantity: 3 });
            await page.loadMemberData();
            page.sessionStatus = 'CLOSED';
            const perform = vi.spyOn(page as any, 'performMarkAsDelivered').mockResolvedValue(undefined);

            await page.markAsDelivered();

            const props = vi.mocked(modalCtrl.create).mock.lastCall![0].componentProps;
            expect(props.netContribution).toBe(20000);
            expect(props.reference).toBe('LIV-A');
            expect(props.items[0].stockAvailable).toBe(3);
            expect(perform).not.toHaveBeenCalled();
        });

        it('goes to the top-up and reopens the recap on return', async () => {
            const { page, navCtrl, modalCtrl } = create({ members: [member], deliveries: [order], modalResult: { action: 'topup', amount: 10000 } });
            await page.loadMemberData();
            page.sessionStatus = 'CLOSED';

            await page.markAsDelivered();

            expect(navCtrl.navigateForward).toHaveBeenCalledWith(['/tontine/collection-recording'], {
                queryParams: { memberId: 'm2', amount: 10000, returnToDelivery: true }
            });
            expect((page as any).reopenDeliverRecapOnReturn).toBe(true);

            const reopen = vi.spyOn(page, 'markAsDelivered').mockResolvedValue(undefined);
            await page.ionViewWillEnter();
            expect(reopen).toHaveBeenCalled();
            expect((page as any).reopenDeliverRecapOnReturn).toBe(false);
            expect(modalCtrl.create).toHaveBeenCalledTimes(1);
        });

        it('saves the reduced order before delivering it', async () => {
            const reduced = [{ ...order.items[0], quantity: 1, totalPrice: 15000, stockAvailable: 10 }];
            const { page, writeService } = create({
                members: [member], deliveries: [order],
                modalResult: { action: 'confirm', items: reduced, reduced: true, total: 15000 }
            });
            await page.loadMemberData();
            page.sessionStatus = 'CLOSED';
            const perform = vi.spyOn(page as any, 'performMarkAsDelivered').mockResolvedValue(undefined);

            await page.markAsDelivered();

            const savedItems = vi.mocked(writeService.replaceDeliveryItems).mock.lastCall![1];
            expect(savedItems[0].quantity).toBe(1);
            expect(savedItems[0].stockAvailable).toBeUndefined();
            expect(page.vm.delivery?.totalAmount).toBe(15000);
            expect(perform).toHaveBeenCalledWith(false);
        });

        it('delivers directly when nothing was reduced', async () => {
            const { page, writeService } = create({
                members: [{ ...member, availableContribution: 40000 }], deliveries: [order],
                modalResult: { action: 'confirm', items: order.items, reduced: false, total: 30000 }
            });
            await page.loadMemberData();
            page.sessionStatus = 'CLOSED';
            const perform = vi.spyOn(page as any, 'performMarkAsDelivered').mockResolvedValue(undefined);

            await page.markAsDelivered();

            expect(writeService.replaceDeliveryItems).not.toHaveBeenCalled();
            expect(perform).toHaveBeenCalledWith(false);
        });

        it('does not open the recap before the session is closed', async () => {
            const { page, modalCtrl } = create({ members: [member], deliveries: [order] });
            await page.loadMemberData();
            page.sessionStatus = 'ACTIVE';

            await page.markAsDelivered();

            expect(modalCtrl.create).not.toHaveBeenCalled();
        });
    });

    describe('order revision', () => {
        const pendingMember = { id: 'm2', clientId: 'c1', deliveryStatus: 'PENDING', availableContribution: 25500 };
        const pendingOrder = {
            id: '5', status: 'PENDING', requestDate: '2026-11-21', deliveryDate: '2026-11-21', totalAmount: 15800,
            items: [{ id: 'i1', articleId: 'a1', quantity: 4, unitPrice: 3200, totalPrice: 12800 }]
        };

        it('shows the ceiling and hides « Livrée le » for an order not yet delivered', async () => {
            const { page } = create({ members: [pendingMember], deliveries: [pendingOrder], ceiling: 25500 });
            await page.loadMemberData();

            expect(page.orderCeiling?.ceiling).toBe(25500);
            expect(page.isDeliveredOrder()).toBe(false);
            expect(page.ceilingExcess()).toBe(0);
        });

        it('opens the dedicated edit page instead of editing the order in place', async () => {
            const { page, navCtrl, writeService } = create({ members: [pendingMember], deliveries: [pendingOrder] });
            await page.loadMemberData();

            page.openOrderEdit();

            expect(navCtrl.navigateForward).toHaveBeenCalledWith(['/tontine/order-edit', 'm2']);
            expect(writeService.replaceDeliveryItems).not.toHaveBeenCalled();
        });

        it('shows the order receipt once when coming back from a saved edit', async () => {
            const { page, orderEditOutcome } = create({ members: [pendingMember], deliveries: [pendingOrder] });
            const print = vi.spyOn(page, 'printOrderReceipt').mockResolvedValue(undefined);
            orderEditOutcome.requestReceipt('m2');

            await page.ionViewWillEnter();
            await page.ionViewWillEnter();

            expect(print).toHaveBeenCalledTimes(1);
        });
    });

    it('shows the net balance and the amount still to pay under the order', async () => {
        const { page } = create({
            members: [{ id: 'm2', clientId: 'c1', deliveryStatus: 'PENDING', availableContribution: 40000 }],
            deliveries: [{ id: 'order', status: 'PENDING', requestDate: '2026-04-01', totalAmount: 55000, items: [{ id: 'i1', quantity: 1, totalPrice: 55000 }] }]
        });
        await page.loadMemberData();

        const balance = page.orderBalance();
        expect(balance?.netContribution).toBe(40000);
        expect(balance?.amountDue).toBe(15000);
        expect(balance?.refundableBalance).toBe(0);
        expect(page.orderBalanceLabels().net).toBe('Solde net cotisé');
    });

    it('does not offer Modifier la commande when the order has no items to edit', async () => {
        const { page } = create({
            deliveries: [{ id: 'order', status: 'PENDING', requestDate: '2026-04-01', items: [] }]
        });
        await page.loadMemberData();
        page.sessionStatus = 'CLOSED';
        expect(page.hasPendingDeliveryToMark()).toBe(true);
        expect(page.canEditPendingOrder()).toBe(false);
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
        expect(page.canEditPendingOrder()).toBe(false);
        expect(page.memberStatusLabel()).toBe('À livrer');
        expect(page.deliveryCreationMenuLabel()).toBe('Livraison Fin d\'Année');
        expect(page.canOpenDeliveryCreation()).toBe(true);
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
        expect(page.canOpenDeliveryCreation()).toBe(false);
    });

    it('ignores a cancelled delivery', async () => {
        const { page } = create({
            deliveries: [{ id: 'gone', status: 'CANCELLED', requestDate: '2026-01-01', items: [{ id: 'i' }] }]
        });
        await page.loadMemberData();
        page.sessionStatus = 'ACTIVE';
        expect(page.vm.delivery).toBeNull();
        expect(page.canOpenDeliveryCreation()).toBe(true);
    });

    it('treats a status-less synced row as an order when the member status says so', async () => {
        const { page } = create({
            members: [{ id: 'm2', clientId: 'c1', deliveryStatus: 'PENDING' }],
            deliveries: [{ id: 'd1', status: null, requestDate: '2026-05-01', items: [] }]
        });
        await page.loadMemberData();
        page.sessionStatus = 'ACTIVE';
        expect(page.vm.delivery?.status).toBe('PENDING');
        expect(page.canOpenDeliveryCreation()).toBe(false);
    });

    it('ignores a status-less row when the member has no order', async () => {
        const { page } = create({
            deliveries: [{ id: 'ghost', status: null, requestDate: '2026-05-01' }]
        });
        await page.loadMemberData();
        page.sessionStatus = 'active';
        expect(page.vm.delivery).toBeNull();
        expect(page.deliveryCreationMenuLabel()).toBe('Commande de tontine');
        expect(page.canOpenDeliveryCreation()).toBe(true);
    });

    it('hides the entry when the delivery lookup fails', async () => {
        const { page } = create({ deliveryError: true });
        await page.loadMemberData();
        page.sessionStatus = 'ACTIVE';
        expect(page.vm.delivery).toBeNull();
        expect(page.canOpenDeliveryCreation()).toBe(false);
    });

    it('hides the entry until the commercial username is known', async () => {
        const { page, deliveryRepo } = create();
        (page as any).commercialUsername = null;
        await page.loadMemberData();
        page.sessionStatus = 'ACTIVE';
        expect(deliveryRepo.getByMemberAndCommercial).not.toHaveBeenCalled();
        expect(page.canOpenDeliveryCreation()).toBe(false);
    });
});
