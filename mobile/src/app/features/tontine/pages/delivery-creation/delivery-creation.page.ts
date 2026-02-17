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
import { DatabaseService } from 'src/app/core/services/database.service';

import { TontineMember, TontineSession, TontineDelivery, TontineDeliveryItem, TontineStock } from 'src/app/models/tontine.model';
import { Client } from 'src/app/models/client.model';
import { selectTontineSession } from 'src/app/store/tontine/tontine.selectors';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { TontineDeliveryReceiptModalComponent } from 'src/app/shared/components/tontine-delivery-receipt-modal/tontine-delivery-receipt-modal.component';
import { PrintableTontineDelivery } from 'src/app/core/services/printing.service';

interface DeliveryViewModel {
    member: TontineMember | null;
    client: Client | null;
    session: TontineSession | null;
    stocks: TontineStock[];
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
    private allStocks: TontineStock[] = [];
    private filteredStocks: TontineStock[] = [];

    // Cart: Map<stockId, quantity>
    private cart = new Map<string, number>();
    // Cart Details: Map<stockId, {price, name, maxQty}> to handle invisible items
    private cartDetails = new Map<string, { price: number, name: string, maxQty: number }>();

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
        private deliveryRepo: TontineDeliveryRepository,
        private dbService: DatabaseService
    ) { }

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
                    // if (session.status !== 'CLOSED' && session.status !== 'ENDED') {
                    //     this.showError('La session doit être clôturée pour effectuer une livraison.');
                    //     this.navCtrl.back();
                    // }
                }
            });

        // Get User
        this.store.select(selectAuthUser)
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => {
                if (user) {
                    this.commercialUsername = user.username;
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

        await this.loadStocks();
    }

    async ionViewWillEnter() {
        // Reload member data to update budget if returning from collection
        if (this.memberId) {
            await this.loadMemberData();
        }
    }

    ngOnDestroy() {
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

    async loadStocks() {
        console.log('LOAD STOCK Enter ...');
        console.log('LOAD STOCK session: ', this.vm.session);
        console.log('Commercial: ', this.commercialUsername);
        if (!this.vm.session || !this.commercialUsername) return;
        console.log('LOAD STOCK After first if ...');
        this.vm.loading = true;
        try {
            // DEBUG: Log raw stocks from DB to diagnose issue
            console.log('DEBUG: Querying all stocks for commercial:', this.commercialUsername);
            const debugStocks = await this.dbService.query('SELECT * FROM tontine_stocks WHERE commercial = ?', [this.commercialUsername]);
            console.log('DEBUG: Raw stocks in DB:', debugStocks.values);
            console.log('DEBUG: Current Session ID:', this.vm.session.id);

            // Load available stocks only
            this.allStocks = await this.stockRepo.getAvailableStocks(
                this.commercialUsername,
                this.vm.session.id
            );
            console.log('Stock loaded: ', this.allStocks);
            this.filteredStocks = [...this.allStocks];
            this.vm.stocks = this.filteredStocks;
        } catch (error) {
            console.error('Error loading stocks:', error);
        } finally {
            this.vm.loading = false;
        }
    }

    onSearch(event: any) {
        this.currentSearchQuery = (event.target.value || '').toLowerCase();
        this.filterStocks();
    }

    private filterStocks() {
        if (!this.currentSearchQuery.trim()) {
            this.filteredStocks = [...this.allStocks];
        } else {
            this.filteredStocks = this.allStocks.filter(stock =>
                stock.articleName?.toLowerCase().includes(this.currentSearchQuery)
            );
        }
        this.vm.stocks = this.filteredStocks;
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
            maxQty: stock.availableQuantity
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
                    // Find the stock to get the articleId
                    const stock = this.allStocks.find(s => s.id === stockId);
                    if (stock) {
                        items.push({
                            id: this.generateUuid(),
                            tontineDeliveryId: deliveryId,
                            articleId: stock.articleId,
                            quantity: qty,
                            unitPrice: details.price,
                            totalPrice: details.price * qty
                        });

                        // Track stock update
                        stockUpdates.push({ stockId: stock.id, quantity: qty });
                    }
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
