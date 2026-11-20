import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, ActionSheetController, ToastController, LoadingController, ModalController } from '@ionic/angular';
import { Subject, firstValueFrom } from 'rxjs';
import { distinctUntilChanged, map, take, takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import { TontineMemberRepository } from 'src/app/core/repositories/tontine-member.repository';
import { TontineCollectionRepository } from 'src/app/core/repositories/tontine-collection.repository';
import { ClientRepository } from 'src/app/core/repositories/client.repository';
import { TontineDeliveryRepository } from 'src/app/core/repositories/tontine-delivery.repository';
import { ArticleRepository } from 'src/app/core/repositories/article.repository';
import { TontineStockRepository } from 'src/app/core/repositories/tontine-stock.repository';
import { TontineWriteService } from 'src/app/core/services/tontine-write.service';
import { TontineService } from 'src/app/core/services/tontine.service';
import { HybridSyncUiService } from 'src/app/core/services/hybrid-sync-ui.service';
import { OnlineWriteError, WriteErrorKind } from 'src/app/core/services/online-first-write.types';
import { DailyConsentGuardService } from 'src/app/features/daily-consent/daily-consent-guard.service';

import { TontineMember, TontineCollection, TontineDelivery, TontineDeliveryItem } from 'src/app/models/tontine.model';
import { Client } from 'src/app/models/client.model';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { loadTontineSession } from 'src/app/store/tontine/tontine.actions';
import { selectTontineSession } from 'src/app/store/tontine/tontine.selectors';
import {
    canMarkTontineDeliveryAsDelivered,
    canPhysicallyDeliverTontine,
    canRecordNormalTontineCollection,
    getTontineDeliveryStatusLabel,
    isTontineDeliveryOrder,
    normalizeTontineStatus,
    pickMemberTontineDelivery,
    tontineDeliveryCreationMenuLabel
} from 'src/app/core/utils/tontine-delivery-status.util';
import { TontineOrderReceiptModalComponent } from 'src/app/shared/components/tontine-order-receipt-modal/tontine-order-receipt-modal.component';
import { PrintableTontineOrder } from 'src/app/core/services/printing.service';
import { generateTontineAuthenticityCode } from 'src/app/core/utils/tontine-delivery-reference.util';
import { stepTontineDeliveryItem } from 'src/app/core/utils/tontine-delivery-item-quantity.util';
import {
    TontineDeliverRecapItem,
    TontineDeliverRecapModalComponent,
    TontineDeliverRecapResult
} from 'src/app/shared/components/tontine-deliver-recap-modal/tontine-deliver-recap-modal.component';
import { TontineDeliveryReceiptModalComponent } from 'src/app/shared/components/tontine-delivery-receipt-modal/tontine-delivery-receipt-modal.component';
import {
    TontineOrderBalance,
    computeTontineOrderBalance,
    tontineOrderBalanceLabels
} from 'src/app/core/utils/tontine-order-balance.util';

interface DeliveryItemWithArticle extends TontineDeliveryItem {
    articleName?: string;
}

interface MemberDetailViewModel {
    member: TontineMember | null;
    client: Client | null;
    collections: TontineCollection[];
    delivery: TontineDelivery | null;
    deliveryItems: DeliveryItemWithArticle[];
    totalCollected: number;
    loading: boolean;
}

@Component({
    selector: 'app-member-detail',
    templateUrl: './member-detail.page.html',
    styleUrls: ['./member-detail.page.scss'],
    standalone: false
})
export class MemberDetailPage implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private memberId: string | null = null;
    private commercialUsername: string | null = null;
    private deliveryLoadToken = 0;
    private memberLoadToken = 0;
    /** Vrai seulement si la lecture des livraisons a échoué : on ne propose pas une nouvelle commande à l'aveugle. */
    private deliveryLookupFailed = false;
    sessionStatus: string | null = null;

    vm: MemberDetailViewModel = {
        member: null,
        client: null,
        collections: [],
        delivery: null,
        deliveryItems: [],
        totalCollected: 0,
        loading: true
    };

    constructor(
        private route: ActivatedRoute,
        private navCtrl: NavController,
        private alertCtrl: AlertController,
        private actionSheetCtrl: ActionSheetController,
        private toastCtrl: ToastController,
        private loadingCtrl: LoadingController,
        private store: Store,
        private tontineService: TontineService,
        private memberRepo: TontineMemberRepository,
        private collectionRepo: TontineCollectionRepository,
        private clientRepo: ClientRepository,
        private deliveryRepo: TontineDeliveryRepository,
        private articleRepo: ArticleRepository,
        private stockRepo: TontineStockRepository,
        private tontineWriteService: TontineWriteService,
        private hybridSyncUiService: HybridSyncUiService,
        private dailyConsentGuard: DailyConsentGuardService,
        private modalCtrl: ModalController
    ) { }

    async ngOnInit() {
        this.memberId = this.route.snapshot.paramMap.get('id');

        if (!this.memberId) {
            await this.showError('ID du membre non trouvé');
            this.goBack();
            return;
        }

        this.route.paramMap
            .pipe(takeUntil(this.destroy$))
            .subscribe(params => {
                const id = params.get('id');
                if (!id || id === this.memberId) {
                    return;
                }
                this.memberId = id;
                void this.loadMemberData();
            });

        // Le nom d'utilisateur peut arriver après le premier affichage (store pas encore prêt).
        this.store.select(selectAuthUser)
            .pipe(
                takeUntil(this.destroy$),
                map(user => user?.username ?? null),
                distinctUntilChanged()
            )
            .subscribe(username => {
                const previous = this.commercialUsername;
                this.commercialUsername = username;
                if (username && username !== previous && this.memberId) {
                    void this.loadMemberData();
                }
            });

        // Ne pas effacer un statut déjà lu en local si le store émet encore null.
        this.store.select(selectTontineSession)
            .pipe(takeUntil(this.destroy$))
            .subscribe(session => {
                if (session?.status) {
                    this.sessionStatus = session.status;
                }
            });

        await this.ensureSessionStatus();
        await this.loadMemberData();
    }

    async ionViewWillEnter() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.memberId = id;
        }
        if (!this.memberId) {
            return;
        }
        await this.ensureSessionStatus();
        await this.loadMemberData();
        if (this.reopenDeliverRecapOnReturn) {
            this.reopenDeliverRecapOnReturn = false;
            await this.markAsDelivered();
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    async loadMemberData() {
        const token = ++this.memberLoadToken;
        const memberId = this.route.snapshot.paramMap.get('id') || this.memberId;
        this.memberId = memberId;
        this.vm.loading = true;
        // Toujours oublier la livraison précédente : une autre membre ne doit pas masquer le menu.
        this.vm.delivery = null;
        this.vm.deliveryItems = [];

        if (!memberId) {
            if (token === this.memberLoadToken) {
                this.vm.loading = false;
            }
            await this.showError('ID du membre non trouvé');
            this.goBack();
            return;
        }

        try {
            const members = await this.memberRepo.findAll();
            if (token !== this.memberLoadToken) {
                return;
            }
            this.vm.member = members.find(m => String(m.id) === String(memberId)) || null;

            if (!this.vm.member) {
                await this.showError('Membre non trouvé');
                this.goBack();
                return;
            }

            this.vm.client = await this.clientRepo.findById(this.vm.member.clientId);
            this.vm.collections = await this.collectionRepo.getByMemberId(memberId);
            this.vm.totalCollected = this.vm.collections.reduce((sum, c) => sum + (c.amount || 0), 0);
            if (token !== this.memberLoadToken) {
                return;
            }
            await this.reloadActiveDelivery();
        } catch (error) {
            if (token !== this.memberLoadToken) {
                return;
            }
            console.error('Error loading member data:', error);
            this.deliveryLookupFailed = true;
            this.vm.delivery = null;
            this.vm.deliveryItems = [];
            await this.showError('Erreur lors du chargement des données');
        } finally {
            if (token === this.memberLoadToken) {
                this.vm.loading = false;
            }
        }
    }

    /**
     * Mode hybride : relit la session sur le serveur quand il répond, puis lit la session locale (SQLite).
     * Hors ligne, c'est la session locale qui sert de référence.
     */
    private async ensureSessionStatus(): Promise<void> {
        await this.tontineService.refreshSessionFromServerIfOnline();
        this.store.dispatch(loadTontineSession());
        try {
            const session = await firstValueFrom(this.tontineService.getSession());
            if (session?.status) {
                this.sessionStatus = session.status;
                return;
            }
        } catch (error) {
            console.error('Session tontine locale indisponible', error);
        }
        try {
            const current = await firstValueFrom(this.store.select(selectTontineSession).pipe(take(1)));
            if (current?.status) {
                this.sessionStatus = current.status;
            }
        } catch {
            // Le store n'est pas encore prêt : le menu reste masqué tant qu'aucun statut n'est connu.
        }
    }

    private async resolveCommercialUsername(): Promise<string | null> {
        if (this.commercialUsername) {
            return this.commercialUsername;
        }
        try {
            const user = await firstValueFrom(this.store.select(selectAuthUser).pipe(take(1)));
            this.commercialUsername = user?.username ?? null;
        } catch {
            this.commercialUsername = null;
        }
        return this.commercialUsername;
    }

    private async reloadActiveDelivery(): Promise<void> {
        const token = ++this.deliveryLoadToken;
        const memberId = this.memberId;
        const username = await this.resolveCommercialUsername();
        if (token !== this.deliveryLoadToken) {
            return;
        }
        if (!memberId || !username) {
            this.vm.delivery = null;
            this.vm.deliveryItems = [];
            this.deliveryLookupFailed = !username;
            return;
        }
        try {
            const deliveries = await this.deliveryRepo.getByMemberAndCommercial(memberId, username);
            if (token !== this.deliveryLoadToken) {
                return;
            }
            const active = pickMemberTontineDelivery(deliveries, this.vm.member?.deliveryStatus);
            this.vm.delivery = active;
            this.vm.deliveryItems = active?.items ? [...active.items] : [];
            this.deliveryLookupFailed = false;
        } catch (error) {
            if (token !== this.deliveryLoadToken) {
                return;
            }
            console.error('Error loading member delivery:', error);
            this.vm.delivery = null;
            this.vm.deliveryItems = [];
            this.deliveryLookupFailed = true;
        }
    }

    getClientDisplayName(): string {
        if (!this.vm.client) return 'Client inconnu';
        return this.vm.client.fullName ||
            `${this.vm.client.firstname || ''} ${this.vm.client.lastname || ''}`.trim();
    }

    getClientInfo(): string {
        if (!this.vm.client) return '';
        const parts = [this.vm.client.phone, this.vm.client.quarter].filter(Boolean);
        return parts.join(' • ');
    }

    getFrequencyLabel(frequency?: string): string {
        const labels: { [key: string]: string } = {
            'DAILY': 'Quotidien',
            'WEEKLY': 'Hebdomadaire',
            'MONTHLY': 'Mensuel'
        };
        return frequency ? labels[frequency] || frequency : 'Non défini';
    }

    getStatusLabel(status?: string): string {
        return getTontineDeliveryStatusLabel(status);
    }

    /**
     * Commande en attente de remise physique (indépendamment de la session).
     * Un membre déjà livré n'a plus rien à remettre, même si une ligne locale est restée en PENDING.
     */
    hasPendingDeliveryToMark(): boolean {
        if (normalizeTontineStatus(this.vm.member?.deliveryStatus) === 'DELIVERED') {
            return false;
        }
        return !!this.vm.delivery && canMarkTontineDeliveryAsDelivered(this.vm.delivery.status);
    }

    /** Remise autorisée seulement si dossier PENDING/VALIDATED et session CLOSED. */
    canMarkAsDelivered(): boolean {
        return this.hasPendingDeliveryToMark() && canPhysicallyDeliverTontine(this.sessionStatus);
    }

    /** Libellé exact du menu, ou null si la session n'ouvre ni la commande ni la remise. */
    deliveryCreationMenuLabel(): string | null {
        return tontineDeliveryCreationMenuLabel(this.sessionStatus);
    }

    /** Cotisation habituelle (Cotiser) : seulement pendant la session ouverte. */
    canRecordNormalCollection(): boolean {
        return canRecordNormalTontineCollection(this.sessionStatus);
    }

    canOpenDeliveryCreation(): boolean {
        return !this.deliveryLookupFailed
            && !this.vm.delivery
            && this.deliveryCreationMenuLabel() !== null;
    }

    async markAsDelivered(): Promise<void> {
        if (!this.vm.delivery || !this.vm.member || !this.hasPendingDeliveryToMark()) {
            return;
        }

        // Mode hybride : la session est relue avant de décider si la remise est possible.
        await this.ensureSessionStatus();

        if (!canPhysicallyDeliverTontine(this.sessionStatus)) {
            const blocked = await this.alertCtrl.create({
                header: 'Action indisponible',
                message: 'Vous pourrez livrer la commande une fois la session de tontine clôturée.',
                cssClass: 'elyk-alert',
                buttons: ['OK']
            });
            await blocked.present();
            return;
        }

        // « Livrer » présente d'abord le récapitulatif : soldes, complément, réduction, puis confirmation.
        const modal = await this.modalCtrl.create({
            component: TontineDeliverRecapModalComponent,
            componentProps: {
                clientName: this.getClientDisplayName(),
                reference: this.vm.delivery.reference,
                items: await this.buildDeliverRecapItems(),
                netContribution: this.vm.member.availableContribution ?? 0
            }
        });
        await modal.present();
        const { data } = await modal.onDidDismiss<TontineDeliverRecapResult>();
        if (!data || data.action === 'cancel') {
            return;
        }
        if (data.action === 'topup') {
            this.reopenDeliverRecapOnReturn = true;
            await this.navCtrl.navigateForward(['/tontine/collection-recording'], {
                queryParams: {
                    memberId: this.memberId,
                    amount: data.amount,
                    returnToDelivery: true
                }
            });
            return;
        }
        if (data.reduced && !(await this.saveReducedOrderBeforeDelivery(data.items))) {
            return;
        }
        await this.performMarkAsDelivered(false);
    }

    /** Retour de « Compléter le solde » : rouvrir le récapitulatif avec le solde à jour. */
    private reopenDeliverRecapOnReturn = false;

    /** Articles de la commande avec le stock tontine disponible chez le commercial. */
    private async buildDeliverRecapItems(): Promise<TontineDeliverRecapItem[]> {
        const items: DeliveryItemWithArticle[] = this.vm.deliveryItems.length
            ? this.vm.deliveryItems
            : (this.vm.delivery ? await this.deliveryRepo.getItems(this.vm.delivery.id) : []);
        let sessionId: string | null = null;
        try {
            const session = await firstValueFrom(this.store.select(selectTontineSession).pipe(take(1)));
            sessionId = session?.id ?? null;
        } catch {
            sessionId = null;
        }
        const recapItems: TontineDeliverRecapItem[] = [];
        for (const item of items) {
            let stockAvailable: number | null = null;
            if (sessionId && this.commercialUsername) {
                const stock = await this.stockRepo.getByArticle(this.commercialUsername, sessionId, item.articleId);
                stockAvailable = stock?.availableQuantity ?? 0;
            }
            recapItems.push({ ...item, stockAvailable });
        }
        return recapItems;
    }

    /** La commande réduite dans le récapitulatif est enregistrée avant la remise. */
    private async saveReducedOrderBeforeDelivery(items: TontineDeliverRecapItem[]): Promise<boolean> {
        if (!this.vm.delivery) {
            return false;
        }
        const lines: DeliveryItemWithArticle[] = items.map(({ stockAvailable, ...item }) => item);
        const loading = await this.loadingCtrl.create({ message: 'Enregistrement de la commande…' });
        await loading.present();
        try {
            const total = await this.tontineWriteService.replaceDeliveryItems(this.vm.delivery, lines);
            this.vm.delivery = { ...this.vm.delivery, totalAmount: total, items: lines };
            this.vm.deliveryItems = [...lines];
            return true;
        } catch (error: any) {
            const toast = await this.toastCtrl.create({
                message: error?.message || 'La commande n\'a pas pu être réduite',
                duration: 3000,
                color: 'danger'
            });
            await toast.present();
            return false;
        } finally {
            await loading.dismiss();
        }
    }

    /** Bon de remise : total cotisé (net), total utilisé, total restant. */
    private async presentHandoverReceipt(items: DeliveryItemWithArticle[], netContribution: number): Promise<void> {
        if (!this.vm.delivery) {
            return;
        }
        const total = this.vm.delivery.totalAmount ?? 0;
        let year = new Date().getFullYear();
        try {
            const session = await firstValueFrom(this.store.select(selectTontineSession).pipe(take(1)));
            year = session?.year ?? year;
        } catch {
            // Session absente du store : l'année courante suffit pour le bon.
        }
        const modal = await this.modalCtrl.create({
            component: TontineDeliveryReceiptModalComponent,
            componentProps: {
                data: {
                    delivery: {
                        id: this.vm.delivery.id,
                        requestDate: this.vm.delivery.requestDate,
                        deliveryDate: new Date().toISOString(),
                        totalAmount: total
                    },
                    items: items.map(item => ({
                        articleName: item.salePackMode && item.salePackMode !== 'UNIT' && item.packLabel
                            ? `${item.articleName || 'Article'} — ${item.packLabel}`
                            : (item.articleName || 'Article'),
                        quantity: item.salePackMode && item.salePackMode !== 'UNIT'
                            ? (item.packCount || item.quantity)
                            : item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice
                    })),
                    client: { fullName: this.getClientDisplayName(), phone: this.vm.client?.phone },
                    session: { year },
                    commercial: { name: this.commercialUsername || this.vm.delivery.commercialUsername || 'Commercial' },
                    totalBudget: netContribution,
                    remainingBudget: Math.max(0, netContribution - total)
                }
            }
        });
        await modal.present();
        await modal.onDidDismiss();
    }

    revisingOrder = false;

    changeItemQuantity(item: DeliveryItemWithArticle, delta: number): void {
        const next = stepTontineDeliveryItem(item, delta);
        if (next === null) {
            if (this.vm.deliveryItems.length <= 1) {
                return;
            }
            this.vm.deliveryItems = this.vm.deliveryItems.filter(current => current !== item);
            return;
        }
        Object.assign(item, next);
    }

    /** Solde net cotisé, reste à payer ou reliquat de la commande affichée (total révisé pendant la modification). */
    orderBalance(): TontineOrderBalance | null {
        if (!this.vm.delivery || !this.vm.member) {
            return null;
        }
        const total = this.revisingOrder ? this.revisedTotal() : this.vm.delivery.totalAmount;
        return computeTontineOrderBalance(this.vm.member.availableContribution, total);
    }

    orderBalanceLabels() {
        return tontineOrderBalanceLabels(normalizeTontineStatus(this.vm.delivery?.status) === 'DELIVERED');
    }

    revisedTotal(): number {
        return this.vm.deliveryItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    }

    cancelOrderRevision(): void {
        this.revisingOrder = false;
        void this.loadMemberData();
    }

    /** Commande encore modifiable tant qu'elle n'est pas livrée ; l'éditeur travaille sur ses articles. */
    canEditPendingOrder(): boolean {
        return this.hasPendingDeliveryToMark() && !this.revisingOrder && this.vm.deliveryItems.length > 0;
    }

    /**
     * Badge de l'en-tête. À la clôture, le serveur passe tous les membres en PENDING :
     * sans commande enregistrée, le membre est seulement « À livrer ».
     */
    memberStatusLabel(): string {
        if (this.vm.delivery) {
            return this.getStatusLabel(this.vm.delivery.status);
        }
        if (isTontineDeliveryOrder(this.vm.member?.deliveryStatus)) {
            return 'À livrer';
        }
        return this.getStatusLabel(this.vm.member?.deliveryStatus);
    }

    memberStatusColor(): string {
        if (this.vm.delivery) {
            return this.getStatusColor(this.vm.delivery.status);
        }
        if (isTontineDeliveryOrder(this.vm.member?.deliveryStatus)) {
            return 'medium';
        }
        return this.getStatusColor(this.vm.member?.deliveryStatus);
    }

    startOrderRevision(): void {
        if (!this.canEditPendingOrder()) {
            return;
        }
        this.revisingOrder = true;
    }

    async saveRevisedOrder(): Promise<void> {
        if (!this.vm.delivery) {
            return;
        }
        if (this.vm.deliveryItems.length === 0) {
            const toast = await this.toastCtrl.create({
                message: 'La commande doit contenir au moins un article.',
                duration: 2500,
                color: 'warning'
            });
            await toast.present();
            return;
        }
        const loading = await this.loadingCtrl.create({ message: 'Enregistrement…' });
        await loading.present();
        try {
            const total = await this.tontineWriteService.replaceDeliveryItems(this.vm.delivery, this.vm.deliveryItems);
            this.vm.delivery.totalAmount = total;
            this.revisingOrder = false;
            const toast = await this.toastCtrl.create({
                message: 'Commande mise à jour',
                duration: 2000,
                color: 'success'
            });
            await toast.present();
            await this.printOrderReceipt();
        } catch (error: any) {
            const toast = await this.toastCtrl.create({
                message: error?.message || 'La commande n\'a pas pu être modifiée',
                duration: 3000,
                color: 'danger'
            });
            await toast.present();
        } finally {
            await loading.dismiss();
        }
    }

    private async performMarkAsDelivered(forceOffline = false): Promise<void> {
        if (!this.vm.delivery || !this.vm.member) {
            return;
        }
        if (!canPhysicallyDeliverTontine(this.sessionStatus)) {
            await this.markAsDelivered();
            return;
        }

        const loading = await this.loadingCtrl.create({ message: 'Mise à jour...' });

        try {
            await this.dailyConsentGuard.requireDailyConsent();
            await loading.present();

            const session = await firstValueFrom(this.store.select(selectTontineSession).pipe(take(1)));
            const items = this.vm.delivery.items?.length
                ? this.vm.delivery.items
                : await this.deliveryRepo.getItems(this.vm.delivery.id);

            const stockUpdates: Array<{ stockId: string; quantity: number }> = [];
            const missingArticles: string[] = [];
            if (session && this.commercialUsername) {
                for (const item of items) {
                    const stock = await this.stockRepo.getByArticle(
                        this.commercialUsername,
                        session.id,
                        item.articleId
                    );
                    if (!stock || (stock.availableQuantity ?? 0) < item.quantity) {
                        missingArticles.push(item.articleName || item.articleId);
                    } else {
                        stockUpdates.push({ stockId: stock.id, quantity: item.quantity });
                    }
                }
            }

            if (missingArticles.length > 0) {
                await loading.dismiss();
                const alert = await this.alertCtrl.create({
                    header: 'Stock tontine insuffisant',
                    message: `Stock tontine insuffisant pour l'article ${missingArticles.join(', ')} — faites une demande de stock tontine avant la remise.`,
                    cssClass: 'elyk-alert',
                    buttons: ['OK']
                });
                await alert.present();
                return;
            }

            await this.tontineWriteService.markDeliveryAsDelivered({
                delivery: { ...this.vm.delivery, items },
                member: this.vm.member,
                stockUpdates
            }, forceOffline);

            await loading.dismiss();
            const toast = await this.toastCtrl.create({
                message: 'Commande livrée.',
                duration: 2000,
                color: 'success'
            });
            await toast.present();
            await this.presentHandoverReceipt(items, this.vm.member.availableContribution ?? 0);
            await this.loadMemberData();
        } catch (error) {
            if (await this.loadingCtrl.getTop()) {
                await loading.dismiss();
            }
            if (error instanceof OnlineWriteError && error.isServerConflict) {
                // Un autre téléphone sur le même compte a déjà remis cette commande.
                const refused = await this.alertCtrl.create({
                    header: 'Déjà livré sur un autre appareil',
                    message: error.message,
                    cssClass: 'elyk-alert',
                    buttons: ['OK']
                });
                await refused.present();
                await this.loadMemberData();
                return;
            }
            if (error instanceof OnlineWriteError && error.kind === WriteErrorKind.BUSINESS && !forceOffline) {
                const saveOffline = await this.hybridSyncUiService.promptOfflineFallback(error.message);
                if (saveOffline) {
                    await this.performMarkAsDelivered(true);
                    return;
                }
            }
            console.error('Error marking delivery as delivered:', error);
            this.showError(error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
        }
    }

    getStatusColor(status?: string): string {
        const colors: { [key: string]: string } = {
            'PENDING': 'tertiary',
            'VALIDATED': 'warning',
            'DELIVERED': 'success',
            'CANCELLED': 'danger'
        };
        return status ? colors[status] || 'medium' : 'medium';
    }

    formatDate(dateString?: string): string {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    formatCurrency(amount?: number): string {
        if (amount === undefined || amount === null) return '0 FCFA';
        return `${amount.toLocaleString('fr-FR')} FCFA`;
    }

    async printOrderReceipt(): Promise<void> {
        if (!this.vm.delivery) {
            return;
        }
        const code = await this.ensureAuthenticityCode(this.vm.delivery);
        const clientName = this.vm.client?.fullName
            || `${this.vm.client?.firstname || ''} ${this.vm.client?.lastname || ''}`.trim()
            || 'Client';
        const data: PrintableTontineOrder = {
            reference: this.vm.delivery.reference,
            authenticityCode: code,
            requestDate: this.vm.delivery.requestDate,
            status: this.vm.delivery.status,
            totalAmount: this.revisingOrder ? this.revisedTotal() : this.vm.delivery.totalAmount,
            clientName,
            clientPhone: this.vm.client?.phone,
            commercialName: this.commercialUsername || this.vm.delivery.commercialUsername,
            netContribution: this.vm.member?.availableContribution ?? null,
            items: this.vm.deliveryItems.map(item => ({
                articleName: item.salePackMode && item.salePackMode !== 'UNIT' && item.packLabel
                    ? `${item.articleName || 'Article'} — ${item.packLabel}`
                    : (item.articleName || 'Article'),
                quantity: item.salePackMode && item.salePackMode !== 'UNIT'
                    ? (item.packCount || item.quantity)
                    : item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice
            }))
        };
        const modal = await this.modalCtrl.create({
            component: TontineOrderReceiptModalComponent,
            componentProps: { data }
        });
        await modal.present();
        await modal.onDidDismiss();
    }

    private async ensureAuthenticityCode(delivery: TontineDelivery): Promise<string> {
        if (delivery.authenticityCode) {
            return delivery.authenticityCode;
        }
        if (delivery.isSync) {
            return '';
        }
        const code = generateTontineAuthenticityCode();
        await this.deliveryRepo.setAuthenticityCode(delivery.id, code);
        delivery.authenticityCode = code;
        return code;
    }

    async showActions() {
        await this.ensureSessionStatus();
        if (!this.vm.member) {
            await this.loadMemberData();
        } else {
            await this.reloadActiveDelivery();
        }
        const deliveryLabel = this.deliveryCreationMenuLabel();
        const actionSheet = await this.actionSheetCtrl.create({
            header: 'Actions',
            buttons: [
                ...(this.canRecordNormalCollection() ? [{
                    text: 'Enregistrer une cotisation',
                    icon: 'cash-outline',
                    handler: () => {
                        this.recordCollection();
                    }
                }] : []),
                {
                    text: 'Voir le client',
                    icon: 'person-outline',
                    handler: () => {
                        this.viewClient();
                    }
                },
                ...(this.canOpenDeliveryCreation() && deliveryLabel ? [{
                    text: deliveryLabel,
                    icon: 'cube-outline',
                    handler: () => {
                        // Naviguer une fois la feuille fermée : la page de création porte une fenêtre inline (panier),
                        // et si elle apparaît pendant la fermeture, Ionic laisse l'écran masqué aux lecteurs d'écran.
                        void actionSheet.onDidDismiss().then(() => this.createDelivery());
                    }
                }] : []),
                ...(this.hasPendingDeliveryToMark() ? [{
                    text: this.canMarkAsDelivered()
                        ? 'Livrer'
                        : 'Livrer (après clôture)',
                    icon: 'checkmark-done-outline',
                    cssClass: this.canMarkAsDelivered() ? undefined : 'elyk-action-disabled',
                    handler: () => {
                        void this.markAsDelivered();
                        return this.canMarkAsDelivered();
                    }
                }] : []),
                ...(this.canEditPendingOrder() ? [{
                    text: 'Modifier la commande',
                    icon: 'create-outline',
                    handler: () => {
                        this.startOrderRevision();
                    }
                }] : []),
                {
                    text: 'Modifier la membre',
                    icon: 'person-circle-outline',
                    handler: () => {
                        this.editMember();
                    }
                },
                {
                    text: 'Supprimer',
                    icon: 'trash-outline',
                    cssClass: 'elyk-action-danger',
                    handler: () => {
                        return false; // Prevent action
                    }
                },
                {
                    text: 'Annuler',
                    icon: 'close',
                    role: 'cancel'
                }
            ],
            cssClass: 'elyk-action-sheet'
        });

        await actionSheet.present();
    }

    recordCollection() {
        this.navCtrl.navigateForward(['/tontine/collection-recording'], {
            queryParams: { memberId: this.memberId }
        });
    }

    viewClient() {
        if (this.vm.client) {
            this.navCtrl.navigateForward(['/client-detail', this.vm.client.id]);
        }
    }

    createDelivery() {
        // Check if session is closed (double check, though UI should hide it if we implement logic there too)
        // For now, just navigate. The DeliveryCreationPage checks status on init.
        this.navCtrl.navigateForward(['/tontine/delivery-creation'], {
            queryParams: { memberId: this.memberId }
        });
    }

    editMember() {
        if (this.memberId) {
            this.navCtrl.navigateForward(['/tontine/member-registration'], {
                queryParams: { memberId: this.memberId }
            });
        }
    }

    async deleteMember() {
        const alert = await this.alertCtrl.create({
            header: 'Confirmer la suppression',
            message: `Êtes-vous sûr de vouloir supprimer ${this.getClientDisplayName()} de cette session de tontine ?`,
            cssClass: 'elyk-alert',
            buttons: [
                {
                    text: 'Annuler',
                    role: 'cancel'
                },
                {
                    text: 'Supprimer',
                    role: 'destructive',
                    handler: async () => {
                        try {
                            await this.memberRepo.delete(this.memberId!);

                            const successAlert = await this.alertCtrl.create({
                                header: 'Succès',
                                message: 'Le membre a été supprimé avec succès.',
                                cssClass: 'elyk-alert',
                                buttons: [{
                                    text: 'OK',
                                    handler: () => {
                                        this.goBack();
                                    }
                                }]
                            });
                            await successAlert.present();
                        } catch (error) {
                            console.error('Error deleting member:', error);
                            this.showError('Erreur lors de la suppression');
                        }
                    }
                }
            ]
        });

        await alert.present();
    }

    async deleteLocalCollection(collection: TontineCollection): Promise<void> {
        if (collection.isSync) {
            const toast = await this.toastCtrl.create({
                message: 'Impossible de supprimer une cotisation déjà synchronisée.',
                duration: 2500,
                color: 'danger'
            });
            await toast.present();
            return;
        }

        const alert = await this.alertCtrl.create({
            header: 'Confirmer la suppression',
            message: `Supprimer la cotisation locale du ${this.formatDate(collection.collectionDate)} (${this.formatCurrency(collection.amount)}) ?`,
            cssClass: 'elyk-alert',
            buttons: [
                { text: 'Annuler', role: 'cancel' },
                {
                    text: 'Supprimer',
                    role: 'destructive',
                    handler: () => {
                        void this.performDeleteLocalCollection(collection);
                    }
                }
            ]
        });
        await alert.present();
    }

    private async performDeleteLocalCollection(collection: TontineCollection): Promise<void> {
        const loading = await this.loadingCtrl.create({
            message: 'Suppression en cours...'
        });
        await loading.present();

        try {
            await this.collectionRepo.deleteLocalUnsyncedCollection(collection.id);
            const toast = await this.toastCtrl.create({
                message: 'Cotisation locale supprimée.',
                duration: 2000,
                color: 'success'
            });
            await toast.present();
            await this.loadMemberData();
        } catch (error: any) {
            console.error('Error deleting local collection:', error);
            this.showError(error?.message || 'Erreur lors de la suppression');
        } finally {
            await loading.dismiss();
        }
    }

    goBack() {
        this.navCtrl.back();
    }

    private async showError(message: string) {
        const alert = await this.alertCtrl.create({
            header: 'Erreur',
            message,
            buttons: ['OK'],
            cssClass: 'elyk-alert'
        });
        await alert.present();
    }
}
