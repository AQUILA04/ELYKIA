import { warehouseStockLabel } from 'src/app/core/utils/warehouse-stock.util';
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FeedbackService } from 'src/app/core/services/feedback.service';
import { tontineCeilingExceededMessage } from 'src/app/core/utils/tontine-order-ceiling.util';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, LoadingController, IonInfiniteScroll, ModalController, ActionSheetController } from '@ionic/angular';
import { MemoizedSelector, Store } from '@ngrx/store';
import { Subject, Observable, firstValueFrom } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

import { TontineMemberRepository } from 'src/app/core/repositories/tontine-member.repository';
import { TontineCollectionRepository } from 'src/app/core/repositories/tontine-collection.repository';
import { ClientRepository } from 'src/app/core/repositories/client.repository';
import { TontineStockRepository } from 'src/app/core/repositories/tontine-stock.repository';
import { TontineDeliveryRepository } from 'src/app/core/repositories/tontine-delivery.repository';
import { TontineWriteService } from 'src/app/core/services/tontine-write.service';
import { TontineService } from 'src/app/core/services/tontine.service';
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
import { normalizePlannedDate, todayIsoDate } from 'src/app/core/utils/tontine-planned-date.util';
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

/** Plafond technique d'unités commandables depuis le catalogue (pas de stock tontine requis). */
const CATALOGUE_MAX_UNITS = 1000000;

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
    /** Offre (unité / pack) choisie par ligne de panier : `mode:unitsPerPack`. */
    private offerSelection = new Map<string, string>();
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
        private tontineService: TontineService,
        private hybridSyncUiService: HybridSyncUiService,
        private dbService: DatabaseService,
        private articleService: ArticleService,
        private tontineCalculationService: TontineCalculationService,
        private dailyConsentGuard: DailyConsentGuardService,
        private dailyConsentState: DailyConsentStateService,
        private feedback: FeedbackService
    ) {
        this.stocks$ = this.store.select(selectPaginatedTontineStocks);
        this.catalogue$ = this.store.select(selectCatalogueArticles);
        this.stockLoading$ = this.store.select(selectTontineStockPaginationLoading);
        this.catalogueLoading$ = this.store.select(selectCatalogueLoading);
        this.stockHasMore$ = this.store.select(selectTontineStockPaginationHasMore);
        this.catalogueHasMore$ = this.store.select(selectCatalogueHasMore);
    }

    /**
     * Filtre rapide des articles : le stock tontine du commercial ou le catalogue général.
     * `null` : choix par défaut selon la session (ouverte → catalogue, clôturée → stock).
     * Une commande choisie dans le stock ne le touche pas ; seule la remise le débite.
     */
    articleSource: 'STOCK' | 'CATALOGUE' | null = null;

    get effectiveArticleSource(): 'STOCK' | 'CATALOGUE' {
        if (this.articleSource) {
            return this.articleSource;
        }
        return normalizeTontineStatus(this.vm.session?.status) === 'CLOSED' ? 'STOCK' : 'CATALOGUE';
    }

    get isCatalogueMode(): boolean {
        return this.effectiveArticleSource === 'CATALOGUE';
    }

    /** Session ouverte : commande seulement ; session clôturée : commande ou remise. */
    get isSessionClosed(): boolean {
        return normalizeTontineStatus(this.vm.session?.status) === 'CLOSED';
    }

    /** Le filtre s'affiche tant qu'une commande est possible (session ouverte ou clôturée). */
    get canChooseArticleSource(): boolean {
        return canCreateTontineOrder(this.vm.session?.status);
    }

    onArticleSourceChange(event: any): void {
        const next = String(event?.detail?.value ?? '') === 'CATALOGUE' ? 'CATALOGUE' : 'STOCK';
        if (next === this.effectiveArticleSource) {
            return;
        }
        this.articleSource = next;
        this.refreshArticleSource();
    }

    /** Quantités déjà commandées par article dans le stock tontine du commercial (indicatif). */
    reservedByArticle = new Map<string, number>();

    reservedFor(stock: TontineStock): number {
        return this.reservedByArticle.get(String(stock.articleId)) ?? 0;
    }

    /** Stock disponible moins ce qui est déjà réservé par d'autres commandes, sans descendre sous zéro. */
    freeFor(stock: TontineStock): number {
        return Math.max(0, (stock.availableQuantity ?? 0) - this.reservedFor(stock));
    }

    private async loadReservations(): Promise<void> {
        if (!this.commercialUsername) {
            this.reservedByArticle = new Map();
            return;
        }
        try {
            this.reservedByArticle = await this.deliveryRepo.reservedQuantitiesByArticle(this.commercialUsername);
        } catch (error) {
            console.error('Error loading tontine stock reservations:', error);
            this.reservedByArticle = new Map();
        }
    }

    async ngOnInit() {
        this.memberId = this.route.snapshot.queryParamMap.get('memberId');

        if (!this.memberId) {
            this.showError('ID du membre manquant');
            this.navCtrl.back();
            return;
        }

        // Même source locale que la fiche membre ; puis, en mode hybride, relecture serveur en arrière-plan
        // (sans bloquer l'écran, et sans effet si le statut n'a pas changé).
        this.store.dispatch(TontineActions.loadTontineSession());
        void this.refreshSessionForGate(true);

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
            this.offerSelection.clear();
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
        void this.loadReservations();
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

    warehouseLabel(article: Article): string {
        return warehouseStockLabel(article.warehouseStock, article.warehouseStockAt);
    }

    catalogueUnitPrice(article: Article): number {
        return article.sellingPrice ?? article.creditSalePrice ?? 0;
    }

    getQuantity(cartKey: string): number {
        return this.cart.get(cartKey) || 0;
    }

    increaseCatalogueQuantity(article: Article) {
        this.ensureOffers(String(article.id), this.catalogueUnitPrice(article));
        const offer = this.selectedOffer(String(article.id), article.id, this.catalogueUnitPrice(article));
        this.bumpCartQuantity(article.id, {
            price: offer.salePrice || this.catalogueUnitPrice(article),
            name: article.commercialName || article.name || 'Article',
            maxQty: Math.floor(CATALOGUE_MAX_UNITS / (offer.unitsPerPack || 1)),
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
        const offer = this.selectedOffer(String(stock.articleId), stock.id, stock.unitPrice);
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

    /** Valeur `mode:unitsPerPack` de l'offre active pour une ligne (défaut : première offre, l'unité). */
    selectedOfferValue(cartKey: string, articleId: string, fallbackPrice: number): string {
        const offer = this.selectedOffer(articleId, cartKey, fallbackPrice);
        return `${offer.mode}:${offer.unitsPerPack}`;
    }

    offerValue(offer: { mode: string; unitsPerPack: number }): string {
        return `${offer.mode}:${offer.unitsPerPack}`;
    }

    /**
     * Change l'offre d'une ligne. Si la ligne est déjà dans le panier, son prix, son conditionnement
     * et sa quantité maximale sont recalculés : le panier reflète toujours l'offre choisie.
     */
    onOfferChange(articleId: string, cartKey: string, raw: string, fallbackPrice: number, name: string, maxQty: number, stockId?: string): void {
        const offer = (this.offersByArticle.get(articleId) || []).find(item => this.offerValue(item) === raw);
        if (!offer) {
            return;
        }
        this.offerSelection.set(cartKey, raw);
        const units = offer.unitsPerPack || 1;
        const maxPacks = Math.floor(maxQty / units);
        const qty = this.getQuantity(cartKey);
        if (qty > 0) {
            this.cartDetails.set(cartKey, {
                price: offer.salePrice || fallbackPrice,
                name,
                maxQty: maxPacks,
                articleId,
                stockId,
                salePackMode: offer.mode || 'UNIT',
                unitsPerPack: units,
                packLabel: offer.label
            });
            if (qty > maxPacks) {
                if (maxPacks > 0) {
                    this.cart.set(cartKey, maxPacks);
                } else {
                    this.cart.delete(cartKey);
                    this.cartDetails.delete(cartKey);
                }
            }
        }
        this.updateBudgetCalculations();
    }

    private selectedOffer(articleId: string, cartKey: string, fallbackPrice: number) {
        const offers = this.offersByArticle.get(articleId);
        const chosen = this.offerSelection.get(cartKey);
        const match = chosen ? offers?.find(item => this.offerValue(item) === chosen) : undefined;
        return match || offers?.[0] || { mode: 'UNIT', label: 'Unité', unitsPerPack: 1, salePrice: fallbackPrice };
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
            await this.feedback.error(tontineCeilingExceededMessage(this.vm.usedBudget, this.vm.projectedBudget), {
                title: 'Plafond dépassé'
            });
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

    /** Date de livraison prévue choisie à la confirmation d'une commande (AAAA-MM-JJ). */
    plannedDeliveryDate: string | null = null;

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
                ? `Total: ${this.vm.usedBudget.toLocaleString('fr-FR')} FCFA\n\nEnregistrer comme commande (articles non encore remis) ?\nDate de livraison prévue (facultatif) :`
                : `Total: ${this.vm.usedBudget.toLocaleString('fr-FR')} FCFA\nRestant: ${this.vm.remainingBudget.toLocaleString('fr-FR')} FCFA\n\nConfirmez-vous la livraison directe ?`,
            // Commande : date de livraison prévue, facultative, à partir d'aujourd'hui.
            inputs: isOrder
                ? [{ name: 'plannedDeliveryDate', type: 'date', min: todayIsoDate(), attributes: { 'data-testid': 'e2e-tontine-planned-date' } }]
                : [],
            buttons: [
                { text: 'Annuler', role: 'cancel' },
                {
                    text: 'Confirmer',
                    handler: (data?: { plannedDeliveryDate?: string }) => {
                        this.plannedDeliveryDate = isOrder ? normalizePlannedDate(data?.plannedDeliveryDate) : null;
                        void this.processDelivery(mode);
                    }
                }
            ]
        });
        await alert.present();
    }

    /**
     * Mode hybride : contrôle la session sur le serveur quand il répond, avant les règles de session.
     * Hors ligne, la session locale reste la référence. `notifyStore` n'est utilisé qu'à l'entrée sur la page,
     * pour ne pas relancer la source des articles pendant un enregistrement.
     * L'écran n'est touché que si le statut a réellement changé sur le serveur : sinon la source des articles
     * et le panier en cours restent tels quels.
     */
    private async refreshSessionForGate(notifyStore = false): Promise<void> {
        const before = await firstValueFrom(this.tontineService.getSession());
        const refreshed = await this.tontineService.refreshSessionFromServerIfOnline();
        if (!refreshed) {
            return;
        }
        const fresh = await firstValueFrom(this.tontineService.getSession());
        if (!fresh) {
            return;
        }
        if (before && normalizeTontineStatus(before.status) === normalizeTontineStatus(fresh.status)) {
            return;
        }
        this.vm.session = fresh;
        if (notifyStore) {
            this.store.dispatch(TontineActions.loadTontineSessionSuccess({ session: fresh }));
        }
    }

    async processDelivery(mode: TontineDeliveryCreationMode = 'DIRECT', forceOffline = false) {
        const loading = await this.loadingCtrl.create({ message: 'Enregistrement...' });
        const isOrder = mode === 'ORDER';
        if (!forceOffline) {
            await this.refreshSessionForGate();
        }

        if (isOrder && !canCreateTontineOrder(this.vm.session?.status)) {
            await this.showSessionGateMessage('ORDER');
            return;
        }
        if (!isOrder && !this.isDirectDeliveryAllowed()) {
            await this.showSessionGateMessage('DIRECT');
            return;
        }
        if (this.exceedsProjected()) {
            await this.feedback.error(tontineCeilingExceededMessage(this.vm.usedBudget, this.vm.projectedBudget), {
                title: 'Plafond dépassé'
            });
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
                plannedDeliveryDate: isOrder ? this.plannedDeliveryDate : null,
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
                if (savedDelivery.mergedIntoExisting) {
                    await this.feedback.success(
                        `Une commande était déjà enregistrée pour ce membre sur un autre appareil (réf. ${savedDelivery.reference || '—'}). Vos articles y ont été ajoutés : total ${savedDelivery.totalAmount.toLocaleString('fr-FR')} FCFA.`,
                        { title: 'Commande complétée' });
                }
                try {
                    await this.presentOrderReceipt(savedDelivery, savedDelivery.mergedIntoExisting
                        ? (savedDelivery.items || items)
                        : items);
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
                // Remise : solde net moins la livraison (le restant prévisionnel ne vaut que pour une commande).
                remainingBudget: Math.max(0, this.vm.availableBudget - savedDelivery.totalAmount)
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

            if (error instanceof OnlineWriteError && error.isServerConflict) {
                // Autre téléphone sur le même compte : le serveur a déjà une commande ou une livraison.
                await this.showDuplicateRefusal(error.message);
                return;
            }

            if (error instanceof OnlineWriteError && error.kind === WriteErrorKind.BUSINESS) {
                if (this.isRealBalanceShortfallMessage(error.message)) {
                    await this.promptBalanceShortfall(error.message);
                    return;
                }
                // Refus du serveur (plafond, session, article…) : rien n'est enregistré, pas même hors ligne,
                // sinon la synchronisation serait refusée de la même façon et la saisie resterait bloquée.
                await this.feedback.error(error, { title: mode === 'ORDER' ? 'Commande refusée' : 'Livraison refusée' });
                return;
            }

            await this.feedback.error(error, {
                title: 'Enregistrement impossible',
                fallback: 'L\'enregistrement a échoué. Rien n\'a été enregistré : réessayez.'
            });
        }
    }

    private isRealBalanceShortfallMessage(message?: string | null): boolean {
        const text = String(message || '').toLowerCase();
        // Message serveur de remise : « Le solde net cotisé (…) ne couvre pas la commande (…) : il manque … ».
        return text.includes('ne couvre pas') && (text.includes('solde') || text.includes('complétez'));
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
            netContribution: this.vm.availableBudget,
            plannedDeliveryDate: delivery.plannedDeliveryDate ?? null,
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

    private async showError(message: unknown) {
        await this.feedback.error(message);
    }

    /** Refus serveur d'une seconde saisie : pas d'enregistrement hors ligne proposé. */
    private async showDuplicateRefusal(message: string) {
        await this.feedback.error(message, { title: 'Déjà enregistré sur un autre appareil' });
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
