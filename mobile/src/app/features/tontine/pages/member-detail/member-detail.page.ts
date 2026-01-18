import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, ActionSheetController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import { TontineMemberRepository } from 'src/app/core/repositories/tontine-member.repository';
import { TontineCollectionRepository } from 'src/app/core/repositories/tontine-collection.repository';
import { ClientRepository } from 'src/app/core/repositories/client.repository';
import { TontineDeliveryRepository } from 'src/app/core/repositories/tontine-delivery.repository';
import { ArticleRepository } from 'src/app/core/repositories/article.repository';

import { TontineMember, TontineCollection, TontineDelivery, TontineDeliveryItem } from 'src/app/models/tontine.model';
import { Client } from 'src/app/models/client.model';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';

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

    vm: MemberDetailViewModel = {
        member: null,
        client: null,
        collections: [],
        delivery: null,
        deliveryItems: [],
        totalCollected: 0,
        loading: true
    };

    monthsList = [
        'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre'
    ];

    constructor(
        private route: ActivatedRoute,
        private navCtrl: NavController,
        private alertCtrl: AlertController,
        private actionSheetCtrl: ActionSheetController,
        private store: Store,
        private memberRepo: TontineMemberRepository,
        private collectionRepo: TontineCollectionRepository,
        private clientRepo: ClientRepository,
        private deliveryRepo: TontineDeliveryRepository,
        private articleRepo: ArticleRepository
    ) { }

    async ngOnInit() {
        this.memberId = this.route.snapshot.paramMap.get('id');

        if (!this.memberId) {
            this.showError('ID du membre non trouvé');
            this.goBack();
            return;
        }

        // Get current user to fetch deliveries
        this.store.select(selectAuthUser)
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => {
                if (user) {
                    this.commercialUsername = user.username;
                }
            });

        await this.loadMemberData();
    }

    async ionViewWillEnter() {
        // Reload data when returning to this page
        if (this.memberId) {
            await this.loadMemberData();
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    async loadMemberData() {
        this.vm.loading = true;

        try {
            // Load member details
            const members = await this.memberRepo.findAll();
            this.vm.member = members.find(m => m.id === this.memberId) || null;

            if (!this.vm.member) {
                this.showError('Membre non trouvé');
                this.goBack();
                return;
            }

            // Load client details
            this.vm.client = await this.clientRepo.findById(this.vm.member.clientId);

            // Load collections history
            this.vm.collections = await this.collectionRepo.getByMemberId(this.memberId!);

            // Calculate total collected
            this.vm.totalCollected = this.vm.collections.reduce((sum, c) => sum + (c.amount || 0), 0);

            // Load delivery info
            if (this.commercialUsername) {
                const deliveries = await this.deliveryRepo.getByMemberAndCommercial(this.memberId!, this.commercialUsername);
                // Assuming one delivery per member for now, or taking the latest/relevant one.
                // Based on model, a member has a deliveryStatus.
                if (deliveries && deliveries.length > 0) {
                    this.vm.delivery = deliveries[0]; // Take the first one found

                    if (this.vm.delivery.items) {
                        // Article names are already populated by the repository via JOIN
                        this.vm.deliveryItems = this.vm.delivery.items;
                    }
                }
            }

        } catch (error) {
            console.error('Error loading member data:', error);
            this.showError('Erreur lors du chargement des données');
        } finally {
            this.vm.loading = false;
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
        const labels: { [key: string]: string } = {
            'PENDING': 'En attente',
            'VALIDATED': 'Validé',
            'DELIVERED': 'Livré',
            'CANCELLED': 'Annulé'
        };
        return status ? labels[status] || status : 'Non défini';
    }

    getStatusColor(status?: string): string {
        const colors: { [key: string]: string } = {
            'PENDING': 'tertiary',  // Light blue
            'VALIDATED': 'success', // Green
            'DELIVERED': 'success',  // Green
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

    async showActions() {
        const actionSheet = await this.actionSheetCtrl.create({
            header: 'Actions',
            buttons: [
                {
                    text: 'Enregistrer une cotisation',
                    icon: 'cash-outline',
                    handler: () => {
                        this.recordCollection();
                    }
                },
                {
                    text: 'Voir le client',
                    icon: 'person-outline',
                    handler: () => {
                        this.viewClient();
                    }
                },
                {
                    text: 'Livraison Fin d\'Année',
                    icon: 'cube-outline',
                    handler: () => {
                        this.createDelivery();
                    }
                },
                {
                    text: 'Modifier',
                    icon: 'create-outline',
                    cssClass: 'disabled-action',
                    handler: () => {
                        return false; // Prevent action
                    }
                },
                {
                    text: 'Supprimer',
                    icon: 'trash-outline',
                    cssClass: 'disabled-action',
                    handler: () => {
                        return false; // Prevent action
                    }
                },
                {
                    text: 'Annuler',
                    icon: 'close',
                    role: 'cancel'
                }
            ]
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
        // TODO: Navigate to edit page
        console.log('Edit member:', this.memberId);
    }

    async deleteMember() {
        const alert = await this.alertCtrl.create({
            header: 'Confirmer la suppression',
            message: `Êtes-vous sûr de vouloir supprimer ${this.getClientDisplayName()} de cette session de tontine ?`,
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

    goBack() {
        this.navCtrl.back();
    }

    private async showError(message: string) {
        const alert = await this.alertCtrl.create({
            header: 'Erreur',
            message,
            buttons: ['OK']
        });
        await alert.present();
    }
}
