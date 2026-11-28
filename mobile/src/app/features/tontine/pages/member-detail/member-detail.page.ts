import { Component, OnInit, OnDestroy, Optional } from '@angular/core';
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

import { TontineMember, TontineCollection, TontineDelivery, TontineDeliveryItem, TontineSocietyShareAdjustmentMode, societyShareModeOf } from 'src/app/models/tontine.model';
import { openSocietyShareForm } from 'src/app/shared/components/tontine-society-share-modal/tontine-society-share-modal.component';
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
import { FeedbackService } from 'src/app/core/services/feedback.service';
import { TontineOrderCeilingService } from 'src/app/core/services/tontine-order-ceiling.service';
import { TontineSocietyShareService } from 'src/app/core/services/tontine-society-share.service';
import { regularContributionOf } from 'src/app/core/utils/tontine-society-share-prompt.util';
import {
    TontineOrderCeiling,
    tontineCeilingExcess
} from 'src/app/core/utils/tontine-order-ceiling.util';
import { isNetworkError } from 'src/app/core/utils/user-error-message.util';
import { TontineOrderEditOutcomeService } from '../order-edit/tontine-order-edit-outcome.service';

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
    /** Réajustement de la part société pour la session (Aucun : boutons cachés). */
    societyShareMode: TontineSocietyShareAdjustmentMode = 'DISABLED';

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
        private modalCtrl: ModalController,
        private feedback: FeedbackService,
        private ceilingService: TontineOrderCeilingService,
        private orderEditOutcome: TontineOrderEditOutcomeService,
        @Optional() private societyShareService?: TontineSocietyShareService
    ) { }

    /** Plafond de la commande du membre affiché (null tant qu'il n'est pas calculé). */
    orderCeiling: TontineOrderCeiling | null = null;

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
                    this.societyShareMode = societyShareModeOf(session);
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
        if (this.orderEditOutcome.consumeReceiptRequest(this.memberId)) {
            await this.printOrderReceipt();
        }
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
            // Solde et historique viennent du serveur quand il répond : l'historique local peut être partiel.
            await this.tontineService.refreshMemberFromServerIfOnline(memberId);
            const members = await this.memberRepo.findAll();
            if (token !== this.memberLoadToken) {
                return;
            }
            this.vm.member = members.find(m => String(m.id) === String(memberId)) || null;
            if (this.vm.member && this.societyShareService) {
                // Part société saisie hors ligne : appliquée au calcul local (plafond) jusqu'à son envoi.
                this.vm.member = await this.societyShareService.withPendingOverride(this.vm.member);
            }

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
            await this.refreshOrderCeiling(token);
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
                this.societyShareMode = societyShareModeOf(session);
                return;
            }
        } catch (error) {
            console.error('Session tontine locale indisponible', error);
        }
        try {
            const current = await firstValueFrom(this.store.select(selectTontineSession).pipe(take(1)));
            if (current?.status) {
                this.sessionStatus = current.status;
                this.societyShareMode = societyShareModeOf(current);
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

    /** Bouton « Réajuster la part société » : membre non livré, session non terminée, avec des collectes. */
    canAdjustSocietyShare(): boolean {
        const member = this.vm.member;
        if (!member || !this.societyShareService) {
            return false;
        }
        if (String(member.deliveryStatus || '').toUpperCase() === 'DELIVERED') {
            return false;
        }
        if (String(this.sessionStatus || '').toUpperCase() === 'ENDED' || this.societyShareMode === 'DISABLED') {
            return false;
        }
        return regularContributionOf(this.vm.collections) > 0;
    }

    societyShareStatusLabel(): string | null {
        const member = this.vm.member;
        if (!member) {
            return null;
        }
        if (member.societyShareStatus === 'ADJUSTED') {
            return member.societyShareLocked ? 'Corrigée par le chef de recouvrement' : 'Réajustée';
        }
        if (member.societyShareStatus === 'CONFIRMED') {
            return member.societyShareLocked ? 'Validée par le chef de recouvrement' : 'Validée';
        }
        return null;
    }

    async adjustSocietyShare(): Promise<void> {
        if (!this.canAdjustSocietyShare() || !this.vm.member || !this.societyShareService) {
            return;
        }
        if (this.vm.member.societyShareLocked) {
            await this.feedback.warning(
                'Le chef de recouvrement a déjà validé la part société de ce membre : elle ne peut plus être modifiée ici.',
                { title: 'Part société validée' }
            );
            return;
        }
        const member = this.vm.member;
        const client = this.vm.client;
        const input = await openSocietyShareForm(this.modalCtrl, {
            clientName: client?.fullName || [client?.firstname, client?.lastname].filter(Boolean).join(' ') || undefined,
            regularContribution: regularContributionOf(this.vm.collections),
            systemSocietyShare: member.societyShareComputed ?? member.societyShare ?? 0,
            currentSocietyShare: member.societyShare ?? 0,
            currentAvailable: member.availableContribution ?? 0
        });
        if (!input) {
            return;
        }
        const loading = await this.loadingCtrl.create({ message: 'Enregistrement...' });
        await loading.present();
        try {
            let session = null;
            try {
                session = await firstValueFrom(this.store.select(selectTontineSession).pipe(take(1)));
            } catch {
                session = null;
            }
            const result = await this.societyShareService.adjust(this.vm.member, session, input.amount, input.comment);
            await loading.dismiss();
            await this.feedback.success(result.message, { title: 'Part société' });
            await this.loadMemberData();
        } catch (error) {
            await loading.dismiss();
            await this.feedback.error(error, { title: 'Part société non enregistrée' });
        }
    }

    /** Plafond : le plus grand du solde prévisionnel et du solde net cotisé (même règle que le serveur). */
    private async refreshOrderCeiling(token: number): Promise<void> {
        if (!this.vm.member) {
            this.orderCeiling = null;
            return;
        }
        let session = null;
        try {
            session = await firstValueFrom(this.store.select(selectTontineSession).pipe(take(1)));
        } catch {
            session = null;
        }
        const ceiling = await this.ceilingService.forMember(this.vm.member, session, this.vm.collections);
        if (token === this.memberLoadToken) {
            this.orderCeiling = ceiling;
        }
    }

    /** Dépassement du plafond par la commande enregistrée (ex. plafond recalculé après une baisse de mise). */
    ceilingExcess(): number {
        if (!this.orderCeiling || !this.vm.delivery) {
            return 0;
        }
        return tontineCeilingExcess(this.vm.delivery.totalAmount ?? 0, this.orderCeiling.ceiling);
    }

    /** Commande remise au membre : « Livrée le » et le plafond en dépendent. */
    isDeliveredOrder(): boolean {
        return normalizeTontineStatus(this.vm.delivery?.status) === 'DELIVERED';
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
                netContribution: this.vm.member.availableContribution ?? 0,
                ceiling: this.orderCeiling?.ceiling ?? null,
                commercialUsername: this.commercialUsername ?? '',
                sessionId: await this.currentSessionId(),
                tontineDeliveryId: this.vm.delivery.id
            }
        });
        await modal.present();
        const { data } = await modal.onDidDismiss<TontineDeliverRecapResult>();
        if (!data || data.action === 'cancel') {
            return;
        }
        if (data.action === 'topup') {
            // La commande modifiée au récapitulatif est enregistrée avant d'aller compléter le solde :
            // le montant à compléter correspond à cette commande-là.
            if (data.reduced && !(await this.saveReducedOrderBeforeDelivery(data.items))) {
                return;
            }
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

    private async currentSessionId(): Promise<string | null> {
        try {
            const session = await firstValueFrom(this.store.select(selectTontineSession).pipe(take(1)));
            return session?.id ?? null;
        } catch {
            return null;
        }
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
        const loading = await this.loadingCtrl.create({ message: 'Enregistrement de la commande…', backdropDismiss: false });
        await loading.present();
        try {
            const total = await this.tontineWriteService.replaceDeliveryItems(this.vm.delivery, lines);
            this.vm.delivery = { ...this.vm.delivery, totalAmount: total, items: lines };
            this.vm.deliveryItems = [...lines];
        } catch (error: unknown) {
            await loading.dismiss();
            await this.feedback.error(error, {
                title: isNetworkError(error) ? 'Pas de connexion' : 'Commande non modifiée',
                fallback: 'La commande n\'a pas pu être modifiée avant la livraison. Rien n\'a été livré.'
            });
            return false;
        }
        await loading.dismiss();
        return true;
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

    /** Solde net cotisé, reste à payer ou reliquat de la commande affichée. */
    orderBalance(): TontineOrderBalance | null {
        if (!this.vm.delivery || !this.vm.member) {
            return null;
        }
        return computeTontineOrderBalance(this.vm.member.availableContribution, this.vm.delivery.totalAmount);
    }

    orderBalanceLabels() {
        return tontineOrderBalanceLabels(normalizeTontineStatus(this.vm.delivery?.status) === 'DELIVERED');
    }

    /** Commande encore modifiable tant qu'elle n'est pas livrée ; la modification se fait sur sa propre page. */
    canEditPendingOrder(): boolean {
        return this.hasPendingDeliveryToMark() && this.vm.deliveryItems.length > 0;
    }

    /** La fiche reste en lecture seule : la modification ouvre la page « Modifier la commande ». */
    openOrderEdit(): void {
        if (!this.canEditPendingOrder() || !this.memberId) {
            return;
        }
        void this.navCtrl.navigateForward(['/tontine/order-edit', this.memberId]);
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

    private async performMarkAsDelivered(forceOffline = false): Promise<void> {
        if (!this.vm.delivery || !this.vm.member) {
            return;
        }
        if (!canPhysicallyDeliverTontine(this.sessionStatus)) {
            await this.markAsDelivered();
            return;
        }

        const loading = await this.loadingCtrl.create({ message: 'Livraison en cours…', backdropDismiss: false });
        const netContribution = this.vm.member.availableContribution ?? 0;
        let items: DeliveryItemWithArticle[] = [];
        let delivered = false;

        try {
            await this.dailyConsentGuard.requireDailyConsent();
            await loading.present();

            const session = await firstValueFrom(this.store.select(selectTontineSession).pipe(take(1)));
            items = this.vm.delivery.items?.length
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
                await this.feedback.warning(
                    `Stock tontine insuffisant pour : ${missingArticles.join(', ')}. Réduisez la commande ou faites d'abord une demande de stock tontine.`,
                    { title: 'Stock tontine insuffisant' });
                return;
            }

            await this.tontineWriteService.markDeliveryAsDelivered({
                delivery: { ...this.vm.delivery, items },
                member: this.vm.member,
                stockUpdates
            }, forceOffline);
            delivered = true;
            await loading.dismiss();
        } catch (error) {
            if (await this.loadingCtrl.getTop()) {
                await loading.dismiss();
            }
            if (error instanceof OnlineWriteError && error.isServerConflict) {
                // Un autre téléphone sur le même compte a déjà remis cette commande.
                await this.feedback.error(error, { title: 'Déjà livré sur un autre appareil' });
                await this.loadMemberData();
                return;
            }
            // Un refus du serveur (4xx) n'est pas enregistré hors ligne : la synchronisation serait refusée
            // de la même façon et la remise resterait bloquée sur la tablette.
            console.error('Error marking delivery as delivered:', error);
            await this.feedback.error(error, {
                title: error instanceof OnlineWriteError && error.kind === WriteErrorKind.BUSINESS
                    ? 'Livraison refusée'
                    : 'Livraison non enregistrée',
                fallback: 'La livraison n\'a pas pu être enregistrée. Rien n\'a été livré.'
            });
            return;
        }
        if (!delivered) {
            return;
        }
        // La remise est enregistrée : un incident d'affichage ou d'impression du bon ne doit pas la contredire.
        try {
            await this.presentHandoverReceipt(items, netContribution);
        } catch (error) {
            console.error('Bon de remise indisponible', error);
            await this.feedback.success('La commande est livrée. Le bon de remise n\'a pas pu s\'afficher.', {
                title: 'Commande livrée'
            });
        }
        await this.loadMemberData();
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
            totalAmount: this.vm.delivery.totalAmount,
            clientName,
            clientPhone: this.vm.client?.phone,
            commercialName: this.commercialUsername || this.vm.delivery.commercialUsername,
            netContribution: this.vm.member?.availableContribution ?? null,
            plannedDeliveryDate: this.vm.delivery.plannedDeliveryDate ?? null,
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
                        this.openOrderEdit();
                    }
                }] : []),
                ...(this.canAdjustSocietyShare() ? [{
                    text: 'Réajuster la part société',
                    icon: 'calculator-outline',
                    handler: () => {
                        void actionSheet.onDidDismiss().then(() => this.adjustSocietyShare());
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

    private async showError(message: unknown) {
        await this.feedback.error(message);
    }
}
