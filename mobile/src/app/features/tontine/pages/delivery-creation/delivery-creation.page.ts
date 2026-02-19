import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, LoadingController, IonInfiniteScroll, ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TontineMemberRepository } from 'src/app/core/repositories/tontine-member.repository';
import { TontineCollectionRepository } from 'src/app/core/repositories/tontine-collection.repository';
import { ClientRepository } from 'src/app/core/repositories/client.repository';
import { TontineStockRepository } from 'src/app/core/repositories/tontine-stock.repository';
import { TontineDeliveryRepository } from 'src/app/core/repositories/tontine-delivery.repository';

import { TontineMember, TontineSession, TontineDelivery, TontineDeliveryItem, TontineStock } from 'src/app/models/tontine.model';
import { Client } from 'src/app/models/client.model';
import { selectTontineSession, selectPaginatedTontineStocks, selectTontineStockPaginationLoading, selectTontineStockPaginationHasMore } from 'src/app/store/tontine/tontine.selectors';
import * as TontineActions from 'src/app/store/tontine/tontine.actions';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { TontineDeliveryReceiptModalComponent } from 'src/app/shared/components/tontine-delivery-receipt-modal/tontine-delivery-receipt-modal.component';
import { PrintableTontineDelivery } from 'src/app/core/services/printing.service';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

interface DeliveryViewModel {
    member: TontineMember | null;
    client: Client | null;
    session: TontineSession | null;
    stocks: TontineStock[]; // Kept for interface compatibility but main source is stocks$
    totalBudget: number;
    usedBudget: number;
    remainingBudget: number;
    selectedCount: number;
    loading: boolean;
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
        usedBudget: 0,
        remainingBudget: 0,
        selectedCount: 0,
        loading: false
    };

    private destroy$ = new Subject<void>();
    private memberId: string | null = null;
    private commercialUsername: string | null = null;

    // Search
    private currentSearchQuery = '';
    stocks$: Observable<TontineStock[]>;
    isLoading$: Observable<boolean>;
    hasMore$: Observable<boolean>;

    // Cart: Map<stockId, quantity>
    private cart = new Map<string, number>();
    // Cart Details: Map<stockId, {price, name, maxQty, articleId}> to handle invisible items
    private cartDetails = new Map<string, { price: number, name: string, maxQty: number, articleId: string }>();

    constructor(
        private route: ActivatedRoute,
        private navCtrl: NavController,
        private alertCtrl: AlertController,
        private loadingCtrl: LoadingController,
        private modalCtrl: ModalController,
        private store: Store,
        private memberRepo: TontineMemberRepository,
        private collectionRepo: TontineCollectionRepository,
        private clientRepo: ClientRepository,
        private stockRepo: TontineStockRepository,
        private deliveryRepo: TontineDeliveryRepository
    ) {
        this.stocks$ = this.store.select(selectPaginatedTontineStocks);
        this.isLoading$ = this.store.select(selectTontineStockPaginationLoading);
        this.hasMore$ = this.store.select(selectTontineStockPaginationHasMore);
    }

    async ngOnInit() {
        this.memberId = this.route.snapshot.queryParamMap.get('memberId');

        if (!this.memberId) {
            this.showError('ID du membre manquant');
            this.navCtrl.back();
            return;
        }

        //Get Session
        this.store.select(selectTontineSession)
            .pipe(takeUntil(this.destroy$))
            .subscribe(session => {
                if (session) {
                    this.vm.session = session;
                    this.loadStocks();
                }
            });

        // Get User
        this.store.select(selectAuthUser)
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => {
                if (user) {
                    this.commercialUsername = user.username;
                    this.loadStocks();
                }
            });

        await this.loadMemberData();

        // Vérifier si une livraison existe déjà pour ce membre
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
                                // Rediriger vers le dashboard général puis automatiquement vers le dashboard tontine
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
        // Reload member data to update budget if returning from collection
        if (this.memberId) {
            await this.loadMemberData();
        }
    }

    ngOnDestroy() {
        this.store.dispatch(TontineActions.resetTontineStockPagination());
        this.destroy$.next();
        this.destroy$.complete();
    }

    async loadMemberData() {
        try {
            const members = await this.memberRepo.findAll();
            this.vm.member = members.find(m => m.id === this.memberId) || null;

            if (this.vm.member) {
                this.vm.client = await this.clientRepo.findById(this.vm.member.clientId);

                // Calculate total budget (Total collected)
                const collections = await this.collectionRepo.getByMemberId(this.memberId!);
                this.vm.totalBudget = collections.reduce((sum, c) => sum + (c.amount || 0), 0);
                this.updateBudgetCalculations();
            }
        } catch (error) {
            console.error('Error loading member:', error);
        }
    }

    loadStocks() {
        if (!this.vm.session || !this.commercialUsername) return;

        this.store.dispatch(TontineActions.loadFirstPageTontineStocks({
            sessionId: this.vm.session.id,
            filters: {
                searchQuery: this.currentSearchQuery
            }
        }));
    }

    loadMoreStocks(event: any) {
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
                // Delay completion slightly to allow UI to update
                setTimeout(() => event.target.complete(), 500);
            });
    }

    onSearch(event: any) {
        this.currentSearchQuery = (event.target.value || '').toLowerCase();
        this.loadStocks();
    }



    // Cart Management
    getQuantity(stockId: string): number {
        return this.cart.get(stockId) || 0;
    }

    increaseQuantity(stock: TontineStock) {
        // Update details cache
        this.cartDetails.set(stock.id, {
            price: stock.unitPrice,
            name: stock.articleName || 'Article',
            maxQty: stock.availableQuantity,
            articleId: stock.articleId
        });

        const currentQty = this.getQuantity(stock.id);

        // Check budget - REMOVED to allow over-selection
        // if (this.vm.remainingBudget < stock.unitPrice) {
        //     // Cannot afford
        //     return;
        // }

        // Check available quantity
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

        this.cart.forEach((qty, stockId) => {
            const details = this.cartDetails.get(stockId);
            if (details) {
                used += details.price * qty;
                count += qty;
            }
        });

        this.vm.usedBudget = used;
        this.vm.remainingBudget = this.vm.totalBudget - used;
        this.vm.selectedCount = count;
    }

    async validateDelivery() {
        if (this.vm.selectedCount === 0) return;
        if (this.vm.remainingBudget < 0) {
            this.showError('Budget dépassé');
            return;
        }

        // Vérifier une dernière fois si une livraison existe déjà (sécurité supplémentaire)
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
                                // Rediriger vers le dashboard général puis automatiquement vers le dashboard tontine
                                this.navigateToTontineDashboard();
                            }
                        }
                    ]
                });
                await alert.present();
                return;
            }
        }

        const alert = await this.alertCtrl.create({
            header: 'Confirmer la livraison',
            message: `Total: ${this.vm.usedBudget.toLocaleString('fr-FR')} FCFA\nRestant: ${this.vm.remainingBudget.toLocaleString('fr-FR')} FCFA\n\nConfirmez-vous cette livraison ?`,
            buttons: [
                { text: 'Annuler', role: 'cancel' },
                {
                    text: 'Confirmer',
                    handler: () => this.processDelivery()
                }
            ]
        });
        await alert.present();
    }

    async processDelivery() {
        const loading = await this.loadingCtrl.create({ message: 'Enregistrement...' });
        await loading.present();

        try {
            const deliveryId = this.generateUuid();
            const items: TontineDeliveryItem[] = [];

            // Prepare items and collect stock IDs for update
            const stockUpdates: Array<{ stockId: string, quantity: number }> = [];

            this.cart.forEach((qty, stockId) => {
                const details = this.cartDetails.get(stockId);
                if (details) {
                    // Use details from cartDetails which now includes articleId (added in increaseQuantity)
                    items.push({
                        id: this.generateUuid(),
                        tontineDeliveryId: deliveryId,
                        articleId: details.articleId,
                        quantity: qty,
                        unitPrice: details.price,
                        totalPrice: details.price * qty
                    });

                    // Track stock update
                    stockUpdates.push({ stockId: stockId, quantity: qty });
                }
            });

            const delivery: TontineDelivery = {
                id: deliveryId,
                tontineMemberId: this.memberId!,
                commercialUsername: this.commercialUsername!,
                requestDate: new Date().toISOString(),
                deliveryDate: new Date().toISOString(), // Immediate delivery
                status: 'DELIVERED',
                totalAmount: this.vm.usedBudget,
                items: items,
                isLocal: true,
                isSync: false
            };

            // Save delivery
            await this.deliveryRepo.save(delivery);

            // Update tontine stocks
            for (const update of stockUpdates) {
                await this.stockRepo.updateQuantities(update.stockId, update.quantity);
            }

            // Update member status to DELIVERED
            if (this.vm.member) {
                this.vm.member.deliveryStatus = 'DELIVERED';
                await this.memberRepo.save(this.vm.member);
            }

            await loading.dismiss();

            // Prepare receipt data
            const receiptData: PrintableTontineDelivery = {
                delivery: {
                    id: delivery.id,
                    requestDate: delivery.requestDate,
                    deliveryDate: delivery.deliveryDate,
                    totalAmount: delivery.totalAmount
                },
                items: items.map(item => {
                    const details = this.cartDetails.get(item.articleId);
                    return {
                        articleName: details?.name || 'Article',
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice
                    };
                }),
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
                totalBudget: this.vm.totalBudget,
                remainingBudget: this.vm.remainingBudget
            };

            // Open receipt modal
            const modal = await this.modalCtrl.create({
                component: TontineDeliveryReceiptModalComponent,
                componentProps: {
                    data: receiptData
                }
            });

            await modal.present();

            // Wait for modal to be dismissed, then navigate to dashboard
            await modal.onDidDismiss();
            // Naviguer vers le dashboard général puis automatiquement vers le dashboard tontine
            // pour éviter qu'un goBack retourne sur cette page
            this.navigateToTontineDashboard();

        } catch (error) {
            console.error('Error processing delivery:', error);
            await loading.dismiss();
            this.showError('Erreur lors de l\'enregistrement');
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
            message: 'Sélectionnez les articles pour la livraison de fin d\'année. Le montant total ne doit pas dépasser le budget épargné par le membre.',
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

    /**
     * Naviguer vers la page de collecte pour compléter le solde du membre
     */
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

    /**
     * Naviguer vers le dashboard général puis automatiquement vers le dashboard tontine
     * Cela évite qu'un goBack retourne sur la page de création de livraison
     */
    private navigateToTontineDashboard(): void {
        // D'abord naviguer vers le dashboard général pour nettoyer l'historique
        this.navCtrl.navigateRoot(['/tabs/dashboard']).then(() => {
            // Ensuite, après un court délai pour que la navigation soit complète,
            // naviguer vers le dashboard tontine
            setTimeout(() => {
                this.navCtrl.navigateForward(['/tontine/dashboard']);
            }, 100);
        });
    }

    /**
     * Vérifier si une livraison existe déjà pour ce membre
     * @returns true si une livraison existe, false sinon
     */
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
            // En cas d'erreur, on considère qu'il n'y a pas de livraison pour ne pas bloquer
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
