import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, LoadingController, IonInfiniteScroll, ModalController, ActionSheetController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Subject, Observable } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

import { TontineMemberRepository } from 'src/app/core/repositories/tontine-member.repository';
import { TontineCollectionRepository } from 'src/app/core/repositories/tontine-collection.repository';
import { ClientRepository } from 'src/app/core/repositories/client.repository';
import { TontineStockRepository } from 'src/app/core/repositories/tontine-stock.repository';
import { TontineDeliveryRepository } from 'src/app/core/repositories/tontine-delivery.repository';
import { TontineWriteService } from 'src/app/core/services/tontine-write.service';
import { HybridSyncUiService } from 'src/app/core/services/hybrid-sync-ui.service';
import { OnlineWriteError, WriteErrorKind } from 'src/app/core/services/online-first-write.types';
import { DatabaseService } from 'src/app/core/services/database.service';
import { TontineCalculationService } from 'src/app/core/services/tontine-calculation.service';

import { TontineMember, TontineSession, TontineDelivery, TontineDeliveryItem, TontineStock, TontineDeliveryCreationMode } from 'src/app/models/tontine.model';
import { Article } from 'src/app/models/article.model';
import { Client } from 'src/app/models/client.model';
import {
    selectTontineSession,
    selectPaginatedTontineStocks,
    selectTontineStockPaginationLoading,
    selectTontineStockPaginationHasMore
} from 'src/app/store/tontine/tontine.selectors';
import * as TontineActions from 'src/app/store/tontine/tontine.actions';
import {
    selectCatalogueArticles,
    selectCatalogueLoading,
    selectCatalogueHasMore
} from 'src/app/store/article/article.selectors';
import * as ArticleActions from 'src/app/store/article/article.actions';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { TontineDeliveryReceiptModalComponent } from 'src/app/shared/components/tontine-delivery-receipt-modal/tontine-delivery-receipt-modal.component';
import { PrintableTontineDelivery } from 'src/app/core/services/printing.service';
import { DailyConsentGuardService } from 'src/app/features/daily-consent/daily-consent-guard.service';
import { DailyConsentStateService } from 'src/app/core/daily-consent/daily-consent-state.service';
import { generateTontineDeliveryReference } from 'src/app/core/utils/tontine-delivery-reference.util';
import {
    canCreateTontineOrder,
    canPhysicallyDeliverTontine
} from 'src/app/core/utils/tontine-delivery-status.util';

interface DeliveryViewModel {
    member: TontineMember | null;
    client: Client | null;
    session: TontineSession | null;
    stocks: TontineStock[];
    totalBudget: number;
    societyShare: number;
    availableBudget: number;
    usedBudget: number;
    remainingBudget: number;
    selectedCount: number;
    loading: boolean;
    allocationVersion: 'V1' | 'V2' | null;
    isOfflineEstimate: boolean;
    isExactBudget: boolean;
}

interface CartLineDetails {
    price: number;
    name: string;
    maxQty: number;
    articleId: string;
    stockId?: string;
}

@Component({
    selector: 'app-delivery-creation',
    templateUrl: './delivery-creation.page.html',
    styleUrls: ['./delivery-creation.page.scss'],
    standalone: false
})
export class DeliveryCreationPage implements OnInit, OnDestroy {
    @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

    vm: DeliveryViewModel = {
        member: null,
        client: null,
        session: null,
        stocks: [],
        totalBudget: 0,
        societyShare: 0,
        availableBudget: 0,
        usedBudget: 0,
        remainingBudget: 0,
        selectedCount: 0,
        loading: false,
        allocationVersion: null,
        isOfflineEstimate: false,
        isExactBudget: true
    };

    private destroy$ = new Subject<void>();
    private memberId: string | null = null;
    private commercialUsername: string | null = null;

    private currentSearchQuery = '';
    stocks$: Observable<TontineStock[]>;
    catalogue$: Observable<Article[]>;
    stockLoading$: Observable<boolean>;
    catalogueLoading$: Observable<boolean>;
    stockHasMore$: Observable<boolean>;
    catalogueHasMore$: Observable<boolean>;

    /** Cart key = articleId (catalogue) or stockId (stock tontine). */
    private cart = new Map<string, number>();
    private cartDetails = new Map<string, CartLineDetails>();
    /** Évite de vider le panier si on recharge la même source (ex. patch e2e du statut). */
    private lastCatalogueMode: boolean | null = null;

    constructor(
        private route: ActivatedRoute,
        private navCtrl: NavController,
        private alertCtrl: AlertController,
        private actionSheetCtrl: ActionSheetController,
        private loadingCtrl: LoadingController,
        private modalCtrl: ModalController,
        private store: Store,
        private memberRepo: TontineMemberRepository,
        private collectionRepo: TontineCollectionRepository,
        private clientRepo: ClientRepository,
        private stockRepo: TontineStockRepository,
        private deliveryRepo: TontineDeliveryRepository,
        private tontineWriteService: TontineWriteService,
        private hybridSyncUiService: HybridSyncUiService,
        private dbService: DatabaseService,
        private tontineCalculationService: TontineCalculationService,
        private dailyConsentGuard: DailyConsentGuardService,
        private dailyConsentState: DailyConsentStateService
    ) {
        this.stocks$ = this.store.select(selectPaginatedTontineStocks);
        this.catalogue$ = this.store.select(selectCatalogueArticles);
        this.stockLoading$ = this.store.select(selectTontineStockPaginationLoading);
        this.catalogueLoading$ = this.store.select(selectCatalogueLoading);
        this.stockHasMore$ = this.store.select(selectTontineStockPaginationHasMore);
        this.catalogueHasMore$ = this.store.select(selectCatalogueHasMore);
    }

    /** Session ACTIVE → catalogue ; CLOSED → stock tontine commercial. */
    get isCatalogueMode(): boolean {
        return canCreateTontineOrder(this.vm.session?.status);
    }

    async ngOnInit() {
        this.memberId = this.route.snapshot.queryParamMap.get('memberId');

        if (!this.memberId) {
            this.showError('ID du membre manquant');
            this.navCtrl.back();
            return;
        }

        this.store.select(selectTontineSession)
            .pipe(takeUntil(this.destroy$))
            .subscribe(session => {
                if (session) {
                    this.vm.session = session;
                    this.refreshArticleSource();
                }
            });

        this.store.select(selectAuthUser)
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => {
                if (user) {
                    this.commercialUsername = user.username;
                    this.refreshArticleSource();
                }
            });

        await this.loadMemberData();

        if (this.commercialUsername && this.memberId) {
            const hasExistingDelivery = await this.checkExistingDelivery();
            if (hasExistingDelivery) {
                const alert = await this.alertCtrl.create({
                    header: 'Livraison déjà effectuée',
                    message: 'Ce membre a déjà une livraison enregistrée. Vous ne pouvez pas créer une nouvelle livraison.',
                    buttons: [
                        {
                            text: 'OK',
                            handler: () => {
                                this.navigateToTontineDashboard();
                            }
                        }
                    ]
                });
                await alert.present();
                return;
            }
        }
    }

    async ionViewWillEnter() {
        if (this.memberId) {
            await this.loadMemberData();
        }
    }

    ngOnDestroy() {
        this.store.dispatch(TontineActions.resetTontineStockPagination());
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Recharge la bonne source (catalogue vs stock) selon le statut de session.
     * Exposé pour les tests e2e qui patchent le statut localement.
     */
    refreshArticleSource(): void {
        const nextCatalogueMode = this.isCatalogueMode;
        if (this.lastCatalogueMode !== nextCatalogueMode) {
            this.cart.clear();
            this.cartDetails.clear();
            this.updateBudgetCalculations();
            this.lastCatalogueMode = nextCatalogueMode;
        }

        if (nextCatalogueMode) {
            this.loadCatalogue();
            return;
        }

        if (!this.vm.session || !this.commercialUsername) {
            return;
        }
        this.loadStocks();
    }

    async loadMemberData() {
        try {
            const members = await this.memberRepo.findAll();
            this.vm.member = members.find(m => m.id === this.memberId) || null;

            if (this.vm.member) {
                this.vm.client = await this.clientRepo.findById(this.vm.member.clientId);

                const collections = await this.collectionRepo.getByMemberId(this.memberId!);
                this.vm.totalBudget = collections.reduce((sum, c) => sum + (c.amount || 0), 0);

                if (this.vm.session) {
                    const status = await this.tontineCalculationService.calculateMemberStatus(
                        this.vm.member,
                        this.vm.session,
                        collections
                    );
                    this.vm.societyShare = status.societyShare;
                    this.vm.availableBudget = status.availableBudget;
                    this.vm.allocationVersion = status.version;
                    this.vm.isOfflineEstimate = status.isOfflineEstimate;
                    this.vm.isExactBudget = status.isExact && !status.isOfflineEstimate;
                } else {
                    this.vm.availableBudget = this.vm.totalBudget;
                    this.vm.isExactBudget = false;
                }

                this.updateBudgetCalculations();
            }
        } catch (error) {
            console.error('Error loading member:', error);
        }
    }

    loadCatalogue() {
        this.store.dispatch(ArticleActions.loadFirstPageCatalogueArticles({
            pageSize: 20,
            filters: { searchQuery: this.currentSearchQuery }
        }));
    }

    loadStocks() {
        if (!this.vm.session || !this.commercialUsername) {
            return;
        }

        this.store.dispatch(TontineActions.loadFirstPageTontineStocks({
            sessionId: this.vm.session.id,
            filters: {
                searchQuery: this.currentSearchQuery
            }
        }));
    }

    loadMoreArticles(event: any) {
        if (this.isCatalogueMode) {
            this.store.select(selectCatalogueHasMore)
                .pipe(take(1))
                .subscribe(hasMore => {
                    if (hasMore) {
                        this.store.dispatch(ArticleActions.loadNextPageCatalogueArticles({
                            filters: { searchQuery: this.currentSearchQuery }
                        }));
                    } else {
                        event.target.disabled = true;
                    }
                    setTimeout(() => event.target.complete(), 500);
                });
            return;
        }

        if (!this.vm.session) {
            event.target.complete();
            return;
        }

        this.store.select(selectTontineStockPaginationHasMore)
            .pipe(take(1))
            .subscribe(hasMore => {
                if (hasMore) {
                    this.store.dispatch(TontineActions.loadNextPageTontineStocks({
                        sessionId: this.vm.session!.id,
                        filters: {
                            searchQuery: this.currentSearchQuery
                        }
                    }));
                } else {
                    event.target.disabled = true;
                }
                setTimeout(() => event.target.complete(), 500);
            });
    }

    onSearch(event: any) {
        this.currentSearchQuery = (event.target.value || '').toLowerCase();
        if (this.isCatalogueMode) {
            this.loadCatalogue();
        } else {
            this.loadStocks();
        }
    }

    catalogueUnitPrice(article: Article): number {
        return article.sellingPrice ?? article.creditSalePrice ?? 0;
    }

    getQuantity(cartKey: string): number {
        return this.cart.get(cartKey) || 0;
    }

    increaseCatalogueQuantity(article: Article) {
        const price = this.catalogueUnitPrice(article);
        this.cartDetails.set(article.id, {
            price,
            name: article.commercialName || article.name || 'Article',
            maxQty: Number.MAX_SAFE_INTEGER,
            articleId: article.id
        });

        const currentQty = this.getQuantity(article.id);
        this.cart.set(article.id, currentQty + 1);
        this.updateBudgetCalculations();
    }

    decreaseCatalogueQuantity(article: Article) {
        const currentQty = this.getQuantity(article.id);
        if (currentQty > 0) {
            const newQty = currentQty - 1;
            if (newQty === 0) {
                this.cart.delete(article.id);
                this.cartDetails.delete(article.id);
            } else {
                this.cart.set(article.id, newQty);
            }
            this.updateBudgetCalculations();
        }
    }

    increaseQuantity(stock: TontineStock) {
        this.cartDetails.set(stock.id, {
            price: stock.unitPrice,
            name: stock.articleName || 'Article',
            maxQty: stock.availableQuantity,
            articleId: stock.articleId,
            stockId: stock.id
        });

        const currentQty = this.getQuantity(stock.id);
        if (currentQty < stock.availableQuantity) {
            this.cart.set(stock.id, currentQty + 1);
            this.updateBudgetCalculations();
        }
    }

    decreaseQuantity(stock: TontineStock) {
        const currentQty = this.getQuantity(stock.id);
        if (currentQty > 0) {
            const newQty = currentQty - 1;
            if (newQty === 0) {
                this.cart.delete(stock.id);
                this.cartDetails.delete(stock.id);
            } else {
                this.cart.set(stock.id, newQty);
            }
            this.updateBudgetCalculations();
        }
    }

    updateBudgetCalculations() {
        let used = 0;
        let count = 0;

        this.cart.forEach((qty, cartKey) => {
            const details = this.cartDetails.get(cartKey);
            if (details) {
                used += details.price * qty;
                count += qty;
            }
        });

        this.vm.usedBudget = used;
        this.vm.remainingBudget = this.vm.availableBudget - used;
        this.vm.selectedCount = count;
    }

    async validateDelivery() {
        if (this.vm.selectedCount === 0) {
            return;
        }
        if (this.vm.remainingBudget < 0) {
            this.showError('Budget dépassé');
            return;
        }

        if (this.commercialUsername && this.memberId) {
            const hasExistingDelivery = await this.checkExistingDelivery();
            if (hasExistingDelivery) {
                const alert = await this.alertCtrl.create({
                    header: 'Livraison déjà effectuée',
                    message: 'Ce membre a déjà une livraison enregistrée. L\'opération est bloquée.',
                    buttons: [
                        {
                            text: 'OK',
                            handler: () => {
                                this.navigateToTontineDashboard();
                            }
                        }
                    ]
                });
                await alert.present();
                return;
            }
        }

        const sessionStatus = this.vm.session?.status;
        const orderAllowed = canCreateTontineOrder(sessionStatus);
        const directAllowed = canPhysicallyDeliverTontine(sessionStatus);

        const sheet = await this.actionSheetCtrl.create({
            header: 'Type d\'opération',
            subHeader: `Total: ${this.vm.usedBudget.toLocaleString('fr-FR')} FCFA — Restant: ${this.vm.remainingBudget.toLocaleString('fr-FR')} FCFA`,
            cssClass: 'elyk-action-sheet',
            buttons: [
                {
                    text: orderAllowed ? 'Commande' : 'Commande (session ouverte uniquement)',
                    icon: 'document-text-outline',
                    cssClass: orderAllowed
                        ? 'e2e-tontine-delivery-mode-order'
                        : 'e2e-tontine-delivery-mode-order elyk-action-disabled',
                    handler: () => {
                        if (!orderAllowed) {
                            void this.showSessionGateMessage('ORDER');
                            return false;
                        }
                        void this.confirmAndProcess('ORDER');
                        return true;
                    }
                },
                {
                    text: directAllowed
                        ? 'Livraison directe'
                        : 'Livraison directe (après clôture)',
                    icon: 'cube-outline',
                    cssClass: directAllowed
                        ? 'e2e-tontine-delivery-mode-direct'
                        : 'e2e-tontine-delivery-mode-direct elyk-action-disabled',
                    handler: () => {
                        if (!directAllowed) {
                            void this.showSessionGateMessage('DIRECT');
                            return false;
                        }
                        void this.confirmAndProcess('DIRECT');
                        return true;
                    }
                },
                {
                    text: 'Annuler',
                    icon: 'close',
                    role: 'cancel'
                }
            ]
        });
        await sheet.present();
    }

    private async showSessionGateMessage(mode: TontineDeliveryCreationMode): Promise<void> {
        const message = mode === 'ORDER'
            ? 'La commande n\'est possible que tant que la session de tontine est ouverte.'
            : 'La livraison directe n\'est possible qu\'une fois la session de tontine clôturée.';
        const alert = await this.alertCtrl.create({
            header: 'Action indisponible',
            message,
            buttons: ['OK']
        });
        await alert.present();
    }

    private async confirmAndProcess(mode: TontineDeliveryCreationMode): Promise<void> {
        const isOrder = mode === 'ORDER';
        if (isOrder && !canCreateTontineOrder(this.vm.session?.status)) {
            await this.showSessionGateMessage('ORDER');
            return;
        }
        if (!isOrder && !canPhysicallyDeliverTontine(this.vm.session?.status)) {
            await this.showSessionGateMessage('DIRECT');
            return;
        }

        const alert = await this.alertCtrl.create({
            header: isOrder ? 'Confirmer la commande' : 'Confirmer la livraison',
            message: isOrder
                ? `Total: ${this.vm.usedBudget.toLocaleString('fr-FR')} FCFA\n\nEnregistrer comme commande (articles non encore remis) ?`
                : `Total: ${this.vm.usedBudget.toLocaleString('fr-FR')} FCFA\nRestant: ${this.vm.remainingBudget.toLocaleString('fr-FR')} FCFA\n\nConfirmez-vous la livraison directe ?`,
            buttons: [
                { text: 'Annuler', role: 'cancel' },
                {
                    text: 'Confirmer',
                    handler: () => {
                        void this.processDelivery(mode);
                    }
                }
            ]
        });
        await alert.present();
    }

    async processDelivery(mode: TontineDeliveryCreationMode = 'DIRECT', forceOffline = false) {
        const loading = await this.loadingCtrl.create({ message: 'Enregistrement...' });
        const isOrder = mode === 'ORDER';

        if (isOrder && !canCreateTontineOrder(this.vm.session?.status)) {
            await this.showSessionGateMessage('ORDER');
            return;
        }
        if (!isOrder && !canPhysicallyDeliverTontine(this.vm.session?.status)) {
            await this.showSessionGateMessage('DIRECT');
            return;
        }

        try {
            const deliveryId = this.generateUuid();
            const items: TontineDeliveryItem[] = [];
            const stockUpdates: Array<{ stockId: string, quantity: number }> = [];
            const nowIso = new Date().toISOString();

            this.cart.forEach((qty, cartKey) => {
                const details = this.cartDetails.get(cartKey);
                if (details) {
                    items.push({
                        id: this.generateUuid(),
                        tontineDeliveryId: deliveryId,
                        articleId: details.articleId,
                        quantity: qty,
                        unitPrice: details.price,
                        totalPrice: details.price * qty,
                        articleName: details.name
                    });

                    if (!isOrder && details.stockId) {
                        stockUpdates.push({ stockId: details.stockId, quantity: qty });
                    }
                }
            });

            await this.dailyConsentGuard.requireDailyConsent();
            await loading.present();

            const delivery: TontineDelivery = {
                id: deliveryId,
                reference: generateTontineDeliveryReference(),
                tontineMemberId: this.memberId!,
                commercialUsername: this.commercialUsername!,
                requestDate: nowIso,
                deliveryDate: nowIso,
                status: isOrder ? 'PENDING' : 'DELIVERED',
                totalAmount: this.vm.usedBudget,
                items: items,
                isLocal: true,
                isSync: false,
                needsDeliverSync: false,
                operationConsentCode: this.dailyConsentState.getActiveConsentCode() ?? undefined
            };

            const savedDelivery = await this.tontineWriteService.createDelivery({
                delivery,
                items,
                stockUpdates: isOrder ? [] : stockUpdates,
                member: this.vm.member!
            }, forceOffline);

            await loading.dismiss();

            if (isOrder) {
                const success = await this.alertCtrl.create({
                    header: 'Commande enregistrée',
                    message: 'La commande est en attente de livraison. Vous pourrez la marquer comme livrée depuis la fiche membre après clôture, une fois votre stock tontine alimenté.',
                    buttons: [{
                        text: 'OK',
                        handler: () => this.navigateToTontineDashboard()
                    }]
                });
                await success.present();
                return;
            }

            const receiptData: PrintableTontineDelivery = {
                delivery: {
                    id: savedDelivery.id,
                    requestDate: savedDelivery.requestDate,
                    deliveryDate: savedDelivery.deliveryDate,
                    totalAmount: savedDelivery.totalAmount
                },
                items: items.map(item => ({
                    articleName: item.articleName || 'Article',
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice
                })),
                client: {
                    fullName: this.vm.client?.fullName || ((this.vm.client?.firstname || '') + ' ' + (this.vm.client?.lastname || '')).trim() || 'Client',
                    phone: this.vm.client?.phone
                },
                session: {
                    year: this.vm.session!.year
                },
                commercial: {
                    name: this.commercialUsername || 'Commercial'
                },
                totalBudget: this.vm.availableBudget,
                remainingBudget: this.vm.remainingBudget
            };

            const modal = await this.modalCtrl.create({
                component: TontineDeliveryReceiptModalComponent,
                componentProps: {
                    data: receiptData
                }
            });

            await modal.present();
            await modal.onDidDismiss();
            this.navigateToTontineDashboard();

        } catch (error) {
            console.error('Error processing delivery:', error);
            if (await this.loadingCtrl.getTop()) {
                await loading.dismiss();
            }

            if (error instanceof OnlineWriteError && error.kind === WriteErrorKind.BUSINESS && !forceOffline) {
                const saveOffline = await this.hybridSyncUiService.promptOfflineFallback(error.message);
                if (saveOffline) {
                    await this.processDelivery(mode, true);
                    return;
                }
            }

            this.showError(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement');
        }
    }

    cancel() {
        if (this.vm.selectedCount > 0) {
            this.alertCtrl.create({
                header: 'Annuler ?',
                message: 'Voulez-vous vraiment annuler ? Les articles sélectionnés seront perdus.',
                buttons: [
                    { text: 'Non', role: 'cancel' },
                    { text: 'Oui', handler: () => this.navCtrl.back() }
                ]
            }).then(a => a.present());
        } else {
            this.navCtrl.back();
        }
    }

    async showHelp() {
        const alert = await this.alertCtrl.create({
            header: 'Aide',
            message: this.isCatalogueMode
                ? 'Choisissez les articles dans le catalogue (sans stock préalable). Validez en « Commande ». La remise se fera après clôture, une fois votre stock tontine alimenté.'
                : 'Choisissez les articles dans votre stock tontine. Validez en « Livraison directe » pour remettre immédiatement les marchandises.',
            buttons: ['OK']
        });
        await alert.present();
    }

    private async showError(message: string) {
        const alert = await this.alertCtrl.create({
            header: 'Erreur',
            message,
            buttons: ['OK']
        });
        await alert.present();
    }

    navigateToCollection(): void {
        if (this.memberId) {
            const surplusAmount = this.vm.remainingBudget < 0 ? Math.abs(this.vm.remainingBudget) : null;

            this.navCtrl.navigateForward(['/tontine/collection-recording'], {
                queryParams: {
                    memberId: this.memberId,
                    amount: surplusAmount,
                    returnToDelivery: true
                }
            });
        }
    }

    private navigateToTontineDashboard(): void {
        this.navCtrl.navigateRoot(['/tabs/dashboard']).then(() => {
            setTimeout(() => {
                this.navCtrl.navigateForward(['/tontine/dashboard']);
            }, 100);
        });
    }

    private async checkExistingDelivery(): Promise<boolean> {
        if (!this.memberId || !this.commercialUsername) {
            return false;
        }

        try {
            const existingDeliveries = await this.deliveryRepo.getByMemberAndCommercial(
                this.memberId,
                this.commercialUsername
            );
            return existingDeliveries && existingDeliveries.length > 0;
        } catch (error) {
            console.error('Erreur lors de la vérification des livraisons existantes:', error);
            return false;
        }
    }

    private generateUuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
