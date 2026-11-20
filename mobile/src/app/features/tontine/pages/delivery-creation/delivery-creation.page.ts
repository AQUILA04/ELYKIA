import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, LoadingController, IonInfiniteScroll, ModalController, ActionSheetController } from '@ionic/angular';
import { MemoizedSelector, Store } from '@ngrx/store';
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
import { ArticleService } from 'src/app/core/services/article.service';
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
import { generateTontineAuthenticityCode, generateTontineDeliveryReference } from 'src/app/core/utils/tontine-delivery-reference.util';
import { TontineOrderReceiptModalComponent } from 'src/app/shared/components/tontine-order-receipt-modal/tontine-order-receipt-modal.component';
import { PrintableTontineOrder } from 'src/app/core/services/printing.service';
import {
    canCreateTontineOrder,
    canPhysicallyDeliverTontine,
    normalizeTontineStatus,
    pickMemberTontineDelivery
} from 'src/app/core/utils/tontine-delivery-status.util';

interface DeliveryViewModel {
    member: TontineMember | null;
    client: Client | null;
    session: TontineSession | null;
    stocks: TontineStock[];
    totalBudget: number;
    societyShare: number;
    availableBudget: number;
    projectedBudget: number;
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
    salePackMode?: string;
    unitsPerPack?: number;
    packLabel?: string;
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
        projectedBudget: 0,
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
    offersByArticle = new Map<string, Array<{ mode: string; label: string; unitsPerPack: number; salePrice: number }>>();
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
        private articleService: ArticleService,
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

    /** Session clôturée : le commercial choisit entre le catalogue (commande) et le stock tontine (remise). */
    catalogueWhenClosed = false;

    /** Session ACTIVE → catalogue ; CLOSED → stock tontine par défaut, catalogue au choix (commande). */
    get isCatalogueMode(): boolean {
        const status = normalizeTontineStatus(this.vm.session?.status);
        if (status === 'ACTIVE') {
            return true;
        }
        return status === 'CLOSED' && this.catalogueWhenClosed;
    }

    get canChooseArticleSource(): boolean {
        return normalizeTontineStatus(this.vm.session?.status) === 'CLOSED';
    }

    onArticleSourceChange(event: any): void {
        const wantsCatalogue = String(event?.detail?.value ?? '') === 'CATALOGUE';
        if (wantsCatalogue === this.catalogueWhenClosed) {
            return;
        }
        this.catalogueWhenClosed = wantsCatalogue;
        this.refreshArticleSource();
    }

    async ngOnInit() {
        this.memberId = this.route.snapshot.queryParamMap.get('memberId');

        if (!this.memberId) {
            this.showError('ID du membre manquant');
            this.navCtrl.back();
            return;
        }

        // Même source locale que la fiche membre : sans ça, le mode commande reste fermé.
        this.store.dispatch(TontineActions.loadTontineSession());

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
            this.vm.member = members.find(m => String(m.id) === String(this.memberId)) || null;

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
                    const estimated = await this.tontineCalculationService.projectBalance(
                        this.vm.member,
                        this.vm.session
                    );
                    // Plafond du panier : jamais sous le solde déjà disponible (cotisations au-delà de l'estimation).
                    this.vm.projectedBudget = Math.max(estimated, status.availableBudget);
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
            this.completeInfiniteScroll(event, selectCatalogueHasMore, () => {
                this.store.dispatch(ArticleActions.loadNextPageCatalogueArticles({
                    filters: { searchQuery: this.currentSearchQuery }
                }));
            });
            return;
        }

        if (!this.vm.session) {
            event.target.complete();
            return;
        }

        this.completeInfiniteScroll(event, selectTontineStockPaginationHasMore, () => {
            this.store.dispatch(TontineActions.loadNextPageTontineStocks({
                sessionId: this.vm.session!.id,
                filters: { searchQuery: this.currentSearchQuery }
            }));
        });
    }

    private completeInfiniteScroll(
        event: any,
        hasMoreSelector: MemoizedSelector<object, boolean, any>,
        loadNext: () => void
    ): void {
        this.store.select(hasMoreSelector)
            .pipe(take(1))
            .subscribe(hasMore => {
                if (hasMore) {
                    loadNext();
                } else {
                    event.target.disabled = true;
                }
                setTimeout(() => event.target.complete(), 500);
            });
    }

    onSearch(event: any) {
        const raw = event?.detail?.value ?? event?.target?.value ?? '';
        this.currentSearchQuery = String(raw).toLowerCase();
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
        this.ensureOffers(String(article.id), this.catalogueUnitPrice(article));
        const offer = this.selectedOffer(String(article.id), this.catalogueUnitPrice(article));
        this.bumpCartQuantity(article.id, {
            price: offer.salePrice || this.catalogueUnitPrice(article),
            name: article.commercialName || article.name || 'Article',
            maxQty: Number.MAX_SAFE_INTEGER,
            articleId: article.id,
            salePackMode: offer.mode,
            unitsPerPack: offer.unitsPerPack,
            packLabel: offer.label
        });
    }

    decreaseCatalogueQuantity(article: Article) {
        this.decreaseCartQuantity(article.id);
    }

    increaseQuantity(stock: TontineStock) {
        this.ensureOffers(String(stock.articleId), stock.unitPrice);
        const offer = this.selectedOffer(String(stock.articleId), stock.unitPrice);
        const units = offer.unitsPerPack || 1;
        this.bumpCartQuantity(stock.id, {
            price: offer.salePrice || stock.unitPrice,
            name: stock.articleName || 'Article',
            maxQty: Math.floor(stock.availableQuantity / units),
            articleId: stock.articleId,
            stockId: stock.id,
            salePackMode: offer.mode,
            unitsPerPack: units,
            packLabel: offer.label
        }, Math.floor(stock.availableQuantity / units));
    }

    offersFor(articleId: string, fallbackPrice: number) {
        this.ensureOffers(articleId, fallbackPrice);
        return this.offersByArticle.get(articleId) || [];
    }

    onOfferChange(articleId: string, cartKey: string, raw: string, fallbackPrice: number, name: string, maxQty: number, stockId?: string): void {
        const [mode, unitsRaw] = String(raw).split(':');
        const units = Number(unitsRaw) || 1;
        const offer = (this.offersByArticle.get(articleId) || []).find(item => `${item.mode}:${item.unitsPerPack}` === raw);
        this.cartDetails.set(cartKey, {
            price: offer?.salePrice || fallbackPrice,
            name,
            maxQty: Math.floor(maxQty / units),
            articleId,
            stockId,
            salePackMode: mode || 'UNIT',
            unitsPerPack: units,
            packLabel: offer?.label
        });
        const qty = this.getQuantity(cartKey);
        if (qty > Math.floor(maxQty / units)) {
            this.cart.set(cartKey, Math.max(0, Math.floor(maxQty / units)));
        }
        this.updateBudgetCalculations();
    }

    private selectedOffer(articleId: string, fallbackPrice: number) {
        const offers = this.offersByArticle.get(articleId);
        return offers?.[0] || { mode: 'UNIT', label: 'Unité', unitsPerPack: 1, salePrice: fallbackPrice };
    }

    private ensureOffers(articleId: string, fallbackPrice: number): void {
        if (!articleId || this.offersByArticle.has(articleId)) {
            return;
        }
        this.offersByArticle.set(articleId, [{ mode: 'UNIT', label: 'Unité', unitsPerPack: 1, salePrice: fallbackPrice }]);
        this.articleService.getSaleOffers(articleId, 'TONTINE', this.commercialUsername || undefined).subscribe(offers => {
            if (offers?.length) {
                this.offersByArticle.set(articleId, offers);
            }
        });
    }

    decreaseQuantity(stock: TontineStock) {
        this.decreaseCartQuantity(stock.id);
    }

    private bumpCartQuantity(cartKey: string, details: CartLineDetails, maxQty?: number): void {
        this.cartDetails.set(cartKey, details);
        const currentQty = this.getQuantity(cartKey);
        if (maxQty !== undefined && currentQty >= maxQty) {
            return;
        }
        this.cart.set(cartKey, currentQty + 1);
        this.updateBudgetCalculations();
    }

    /** Panier : fenêtre qui liste tous les articles choisis avec leur quantité. */
    cartOpen = false;

    get cartLines(): Array<{ key: string; name: string; offer: string; quantity: number; unitPrice: number; total: number; canIncrease: boolean }> {
        const lines: Array<{ key: string; name: string; offer: string; quantity: number; unitPrice: number; total: number; canIncrease: boolean }> = [];
        this.cart.forEach((quantity, key) => {
            const details = this.cartDetails.get(key);
            if (!details || quantity <= 0) {
                return;
            }
            const isPack = !!details.salePackMode && details.salePackMode !== 'UNIT';
            lines.push({
                key,
                name: details.name,
                offer: isPack ? (details.packLabel || 'Pack') : '',
                quantity,
                unitPrice: details.price,
                total: details.price * quantity,
                canIncrease: quantity < details.maxQty
            });
        });
        return lines;
    }

    openCart(): void {
        this.cartOpen = true;
    }

    closeCart(): void {
        this.cartOpen = false;
    }

    increaseCartLine(key: string): void {
        const details = this.cartDetails.get(key);
        if (details) {
            this.bumpCartQuantity(key, details, details.maxQty);
        }
    }

    decreaseCartLine(key: string): void {
        this.decreaseCartQuantity(key);
        if (this.cart.size === 0) {
            this.cartOpen = false;
        }
    }

    removeCartLine(key: string): void {
        this.cart.delete(key);
        this.cartDetails.delete(key);
        this.updateBudgetCalculations();
        if (this.cart.size === 0) {
            this.cartOpen = false;
        }
    }

    private decreaseCartQuantity(cartKey: string): void {
        const currentQty = this.getQuantity(cartKey);
        if (currentQty <= 0) {
            return;
        }
        const newQty = currentQty - 1;
        if (newQty === 0) {
            this.cart.delete(cartKey);
            this.cartDetails.delete(cartKey);
        } else {
            this.cart.set(cartKey, newQty);
        }
        this.updateBudgetCalculations();
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
        this.vm.remainingBudget = this.vm.projectedBudget - used;
        this.vm.selectedCount = count;
    }

    get cashGap(): number {
        return this.vm.availableBudget - this.vm.usedBudget;
    }

    exceedsProjected(): boolean {
        return this.vm.usedBudget > this.vm.projectedBudget + 0.001;
    }

    async validateDelivery() {
        if (this.vm.selectedCount === 0) {
            return;
        }
        if (this.exceedsProjected()) {
            await this.showError('Le montant dépasse le solde prévisionnel de l\'année.');
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
        const directAllowed = this.isDirectDeliveryAllowed();

        const sheet = await this.actionSheetCtrl.create({
            header: 'Type d\'opération',
            subHeader: `Total: ${this.vm.usedBudget.toLocaleString('fr-FR')} FCFA — Restant: ${this.vm.remainingBudget.toLocaleString('fr-FR')} FCFA`,
            cssClass: 'elyk-action-sheet',
            buttons: [
                {
                    text: orderAllowed ? 'Commande' : 'Commande (session terminée)',
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
                        : (canPhysicallyDeliverTontine(sessionStatus)
                            ? 'Livraison directe (choisir le stock tontine)'
                            : 'Livraison directe (après clôture)'),
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

    /** Remise directe : session clôturée et articles pris dans le stock tontine (jamais le catalogue). */
    private isDirectDeliveryAllowed(): boolean {
        return canPhysicallyDeliverTontine(this.vm.session?.status) && !this.isCatalogueMode;
    }

    private async showSessionGateMessage(mode: TontineDeliveryCreationMode): Promise<void> {
        let message: string;
        if (mode === 'ORDER') {
            message = 'La commande n\'est plus possible : la session de tontine est terminée.';
        } else if (canPhysicallyDeliverTontine(this.vm.session?.status)) {
            message = 'Pour une livraison directe, choisissez « Stock tontine » comme source des articles.';
        } else {
            message = 'La livraison directe n\'est possible qu\'une fois la session de tontine clôturée.';
        }
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
        if (!isOrder && !this.isDirectDeliveryAllowed()) {
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
        if (!isOrder && !this.isDirectDeliveryAllowed()) {
            await this.showSessionGateMessage('DIRECT');
            return;
        }
        if (this.exceedsProjected()) {
            await this.showError('Le montant dépasse le solde prévisionnel de l\'année.');
            return;
        }
        if (!isOrder && this.cashGap < -0.001) {
            await this.promptBalanceShortfall();
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
                    const units = details.unitsPerPack || 1;
                    const unitQuantity = qty * units;
                    items.push({
                        id: this.generateUuid(),
                        tontineDeliveryId: deliveryId,
                        articleId: details.articleId,
                        quantity: unitQuantity,
                        unitPrice: details.price,
                        totalPrice: details.price * qty,
                        articleName: details.name,
                        salePackMode: details.salePackMode || 'UNIT',
                        packCount: qty,
                        unitsPerPack: units,
                        packLabel: details.packLabel
                    });

                    if (!isOrder && details.stockId) {
                        stockUpdates.push({ stockId: details.stockId, quantity: unitQuantity });
                    }
                }
            });

            await this.dailyConsentGuard.requireDailyConsent();
            await loading.present();

            const delivery: TontineDelivery = {
                id: deliveryId,
                reference: generateTontineDeliveryReference(),
                authenticityCode: generateTontineAuthenticityCode(),
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
                try {
                    await this.presentOrderReceipt(savedDelivery, items);
                } catch (printError) {
                    console.error('Error opening tontine order receipt:', printError);
                }
                this.navigateToTontineDashboard();
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
                    articleName: item.salePackMode && item.salePackMode !== 'UNIT'
                        ? `${item.articleName || 'Article'} — ${item.packCount} × ${item.packLabel || 'Pack'}`
                        : (item.articleName || 'Article'),
                    quantity: item.salePackMode && item.salePackMode !== 'UNIT' ? (item.packCount || item.quantity) : item.quantity,
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
                if (this.isRealBalanceShortfallMessage(error.message)) {
                    await this.promptBalanceShortfall(error.message);
                    return;
                }
                const saveOffline = await this.hybridSyncUiService.promptOfflineFallback(error.message);
                if (saveOffline) {
                    await this.processDelivery(mode, true);
                    return;
                }
            }

            this.showError(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement');
        }
    }

    private isRealBalanceShortfallMessage(message?: string | null): boolean {
        const text = String(message || '').toLowerCase();
        return text.includes('solde réel') && (text.includes('ne couvre pas') || text.includes('complétez'));
    }

    /** Remise impossible faute de solde : proposer Compléter le solde ou rester pour modifier le panier. */
    private async promptBalanceShortfall(serverMessage?: string): Promise<void> {
        const gap = Math.max(0, Math.abs(this.cashGap));
        const alert = await this.alertCtrl.create({
            header: 'Solde insuffisant',
            message: serverMessage
                || `Le solde réel ne couvre pas le panier. Il manque ${gap.toLocaleString('fr-FR')} FCFA. Complétez le solde ou réduisez les articles.`,
            cssClass: 'elyk-alert',
            buttons: [
                { text: 'Modifier le panier', role: 'cancel' },
                {
                    text: 'Compléter le solde',
                    handler: () => {
                        this.navigateToCollection();
                    }
                }
            ]
        });
        await alert.present();
    }

    private async presentOrderReceipt(delivery: TontineDelivery, items: TontineDeliveryItem[]): Promise<void> {
        const clientName = this.vm.client?.fullName
            || `${this.vm.client?.firstname || ''} ${this.vm.client?.lastname || ''}`.trim()
            || 'Client';
        const data: PrintableTontineOrder = {
            reference: delivery.reference,
            authenticityCode: delivery.authenticityCode,
            requestDate: delivery.requestDate,
            status: delivery.status,
            totalAmount: delivery.totalAmount,
            clientName,
            clientPhone: this.vm.client?.phone,
            commercialName: this.commercialUsername || 'Commercial',
            items: items.map(item => ({
                articleName: item.salePackMode && item.salePackMode !== 'UNIT'
                    ? `${item.articleName || 'Article'} — ${item.packLabel || 'Pack'}`
                    : (item.articleName || 'Article'),
                quantity: item.salePackMode && item.salePackMode !== 'UNIT' ? (item.packCount || item.quantity) : item.quantity,
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

    async explainOrderReduction(): Promise<void> {
        const alert = await this.alertCtrl.create({
            header: 'Modifier la commande',
            message: `Diminuez les quantités ou retirez des articles jusqu'à ce que le total tienne dans le solde réel (${this.vm.availableBudget.toLocaleString('fr-FR')} FCFA).`,
            buttons: ['OK']
        });
        await alert.present();
    }

    navigateToCollection(): void {
        if (this.memberId) {
            const surplusAmount = this.cashGap < 0 ? Math.abs(this.cashGap) : null;

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
            return pickMemberTontineDelivery(existingDeliveries, this.vm.member?.deliveryStatus) != null;
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
