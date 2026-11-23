import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Subject, BehaviorSubject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TontineMemberRepository } from 'src/app/core/repositories/tontine-member.repository';
import { TontineCollectionRepository } from 'src/app/core/repositories/tontine-collection.repository';
import { TontineWriteService } from 'src/app/core/services/tontine-write.service';
import { TontineService } from 'src/app/core/services/tontine.service';
import { HybridSyncUiService } from 'src/app/core/services/hybrid-sync-ui.service';
import { OnlineWriteError, WriteErrorKind } from 'src/app/core/services/online-first-write.types';
import { ClientRepository } from 'src/app/core/repositories/client.repository';
import { TontineMember, TontineCollection, TontineSession } from 'src/app/models/tontine.model';
import { Client } from 'src/app/models/client.model';
import { selectTontineSession } from 'src/app/store/tontine/tontine.selectors';
import * as TontineActions from 'src/app/store/tontine/tontine.actions';
import * as KpiActions from 'src/app/store/kpi/kpi.actions';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { PrintableTontineCollection } from 'src/app/core/services/printing.service';
import { TontineReceiptModalComponent } from 'src/app/shared/components/tontine-receipt-modal/tontine-receipt-modal.component';
import { DailyConsentGuardService } from 'src/app/features/daily-consent/daily-consent-guard.service';
import { DailyConsentStateService } from 'src/app/core/daily-consent/daily-consent-state.service';
import { AmountConfirmationService } from 'src/app/features/amount-confirmation/amount-confirmation.service';
import {
    canRecordDeliveryTontineCollection,
    canRecordNormalTontineCollection,
    normalizeTontineStatus
} from 'src/app/core/utils/tontine-delivery-status.util';

interface MemberWithClient extends TontineMember {
    client?: Client | null;
    clientName?: string;
    clientAddress?: string;
    clientQuarter?: string;
}

@Component({
    selector: 'app-collection-recording',
    templateUrl: './collection-recording.page.html',
    styleUrls: ['./collection-recording.page.scss'],
    standalone: false
})
export class CollectionRecordingPage implements OnInit, OnDestroy {
    collectionForm!: FormGroup;
    members: MemberWithClient[] = [];
    filteredMembers: MemberWithClient[] = [];
    selectedMember: MemberWithClient | null = null;
    searchTerm$ = new BehaviorSubject<string>('');
    currentDate = new Date();

    private destroy$ = new Subject<void>();
    private session: TontineSession | null = null;
    private commercialUsername: string | null = null;
    loading = false;
    /** Complément à la livraison : montant minimal = reste à payer (jamais moins). */
    requiredAmount: number | null = null;

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private navCtrl: NavController,
        private alertCtrl: AlertController,
        private loadingCtrl: LoadingController,
        private modalCtrl: ModalController,
        private toastCtrl: ToastController,
        private store: Store,
        private memberRepo: TontineMemberRepository,
        private collectionRepo: TontineCollectionRepository,
        private clientRepo: ClientRepository,
        private tontineWriteService: TontineWriteService,
        private tontineService: TontineService,
        private hybridSyncUiService: HybridSyncUiService,
        private dailyConsentGuard: DailyConsentGuardService,
        private dailyConsentState: DailyConsentStateService,
        private amountConfirmation: AmountConfirmationService
    ) {
        this.initializeForm();
    }

    /**
     * Mode hybride : relit la session sur le serveur quand il répond, puis la lit en local.
     * Hors ligne, la session locale reste la référence.
     * À l'entrée sur la page (`notifyStore`), la session est aussi posée dans le store.
     * Rien n'est modifié si le statut n'a pas changé sur le serveur.
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
        this.session = fresh;
        if (notifyStore) {
            this.store.dispatch(TontineActions.loadTontineSessionSuccess({ session: fresh }));
        }
    }

    async ngOnInit() {
        // Session locale d'abord ; en mode hybride, relecture serveur en arrière-plan (sans bloquer l'écran).
        this.store.dispatch(TontineActions.loadTontineSession());
        void this.refreshSessionForGate(true);

        // Get current session
        this.store.select(selectTontineSession)
            .pipe(takeUntil(this.destroy$))
            .subscribe(async session => {
                if (session) {
                    this.session = session;

                    const returnToDelivery = this.isDeliveryCollectionFlow();
                    const collectionAllowed = returnToDelivery
                        ? canRecordDeliveryTontineCollection(session.status)
                        : canRecordNormalTontineCollection(session.status);

                    if (!collectionAllowed) {
                        await this.showSessionBlockedAlert(returnToDelivery);
                        return;
                    }

                    await this.loadMembers();

                    // Check for pre-selected member
                    const preSelectedMemberId = this.route.snapshot.queryParamMap.get('memberId');
                    const preFilledAmount = this.route.snapshot.queryParamMap.get('amount');

                    if (preSelectedMemberId) {
                        const member = this.members.find(m => m.id === preSelectedMemberId);
                        if (member) {
                            this.selectMember(member);

                            // If amount is passed (from delivery creation), override the default amount
                            if (preFilledAmount) {
                                const due = parseFloat(preFilledAmount);
                                this.collectionForm.patchValue({ amount: due });
                                if (returnToDelivery && due > 0) {
                                    this.requiredAmount = due;
                                    this.collectionForm.get('amount')?.setValidators([Validators.required, Validators.min(due)]);
                                    this.collectionForm.get('amount')?.updateValueAndValidity();
                                }
                            }
                        }
                    }
                }
            });

        // Get current user
        this.store.select(selectAuthUser)
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => {
                if (user) {
                    this.commercialUsername = user.username;
                }
            });

        // Subscribe to search
        this.searchTerm$
            .pipe(takeUntil(this.destroy$))
            .subscribe(term => this.filterMembers(term));
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initializeForm() {
        this.collectionForm = this.fb.group({
            amount: [null, [Validators.required, Validators.min(1)]],
            notes: ['']
        });
    }

    async loadMembers() {
        if (!this.session) return;

        this.loading = true;
        try {
            const allMembers = await this.memberRepo.findAll();
            const sessionMembers = allMembers.filter(m => m.tontineSessionId === this.session!.id);

            // Load client details for each member
            this.members = await Promise.all(sessionMembers.map(async (member) => {
                const client = await this.clientRepo.findById(member.clientId);
                return {
                    ...member,
                    client,
                    clientName: client ? (client.fullName || `${client.firstname} ${client.lastname}`.trim()) : 'Client Inconnu',
                    clientAddress: client?.address || '',
                    clientQuarter: client?.quarter || ''
                };
            }));

            this.filteredMembers = [...this.members];
        } catch (error) {
            console.error('Error loading members:', error);
        } finally {
            this.loading = false;
        }
    }

    filterMembers(searchTerm: string) {
        if (!searchTerm.trim()) {
            this.filteredMembers = [...this.members];
            return;
        }

        const term = searchTerm.toLowerCase();
        this.filteredMembers = this.members.filter(member =>
            member.clientName?.toLowerCase().includes(term) ||
            member.clientId?.toLowerCase().includes(term)
        );
    }

    onSearchChange(event: any) {
        this.searchTerm$.next(event.target.value || '');
    }

    selectMember(member: MemberWithClient) {
        this.selectedMember = member;
        // Pre-fill amount with member's expected amount
        if (member.amount) {
            this.collectionForm.patchValue({ amount: member.amount });
        }
    }

    removeMember() {
        this.selectedMember = null;
        this.collectionForm.patchValue({ amount: null });
    }

    async onSubmit() {
        if (!this.selectedMember) {
            this.showAlert('Membre requis', 'Veuillez sélectionner un membre pour continuer.');
            return;
        }

        if (this.collectionForm.invalid) {
            this.collectionForm.markAllAsTouched();
            if (this.requiredAmount !== null) {
                await this.showAlert('Montant insuffisant', `Le montant doit couvrir au moins le reste à payer : ${this.formatCurrency(this.requiredAmount)}.`);
            }
            return;
        }

        if (!this.commercialUsername) {
            this.showAlert('Erreur', 'Utilisateur non trouvé. Veuillez réessayer.');
            return;
        }

        const loading = await this.loadingCtrl.create({
            message: 'Enregistrement en cours...'
        });
        let newCollection: TontineCollection | null = null;

        try {
            const formValue = this.collectionForm.value;

            await this.dailyConsentGuard.requireDailyConsent();
            const confirmedAmount = await this.amountConfirmation.confirmAmount(formValue.amount);

            await loading.present();

            await this.refreshSessionForGate();
            const returnToDelivery = this.isDeliveryCollectionFlow();
            if (this.session) {
                const collectionAllowed = returnToDelivery
                    ? canRecordDeliveryTontineCollection(this.session.status)
                    : canRecordNormalTontineCollection(this.session.status);
                if (!collectionAllowed) {
                    await this.showSessionBlockedAlert(returnToDelivery);
                    return;
                }
            }

            newCollection = {
                id: this.generateUuid(),
                tontineMemberId: this.selectedMember.id,
                amount: formValue.amount,
                collectionDate: new Date().toISOString(),
                commercialUsername: this.commercialUsername,
                isLocal: true,
                isSync: false,
                isDeliveryCollection: returnToDelivery,
                notes: formValue.notes,
                operationConsentCode: this.dailyConsentState.getActiveConsentCode() ?? undefined,
                confirmedAmount,
                advanceToNextMonth: false,
                contributionMonth: `${new Date().toISOString().substring(0, 7)}-01`
            };

            await this.persistCollection(newCollection, false, loading);

        } catch (error) {
            if (await this.loadingCtrl.getTop()) {
                await loading.dismiss();
            }
            console.error('Error saving collection:', error);

            if (error instanceof OnlineWriteError && error.kind === WriteErrorKind.BUSINESS && newCollection) {
                const saveOffline = await this.hybridSyncUiService.promptOfflineFallback(error.message);
                if (saveOffline) {
                    await this.persistCollection(newCollection, true);
                    return;
                }
            }

            this.showAlert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'enregistrement.');
        }
    }

    private async persistCollection(
        newCollection: TontineCollection,
        forceOffline: boolean,
        loading?: HTMLIonLoadingElement
    ): Promise<void> {
        if (!loading) {
            loading = await this.loadingCtrl.create({ message: 'Enregistrement en cours...' });
            await loading.present();
        }

        try {
            const savedCollection = await this.tontineWriteService.recordCollection(newCollection, forceOffline);

            this.store.dispatch(TontineActions.loadTontineCollections());

            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const endDate = now.toISOString().split('T')[0];
            const dateFilter = { startDate, endDate };
            this.store.dispatch(KpiActions.loadTontineSummaryKpi({
                commercialUsername: this.commercialUsername!,
                dateFilter
            }));

            if (await this.loadingCtrl.getTop()) {
                await loading.dismiss();
            }

            if (savedCollection.isDeliveryCollection) {
                // Complément à la livraison : pas de reçu, retour au récapitulatif de la livraison en cours.
                const toast = await this.toastCtrl.create({
                    message: 'Complément enregistré. Solde mis à jour.',
                    duration: 2500,
                    position: 'bottom'
                });
                await toast.present();
                this.navCtrl.back();
                return;
            }

            const refreshedMember = await this.memberRepo.findById(this.selectedMember!.id);
            const availableBalance = refreshedMember?.availableContribution ?? 0;

            const receiptData: PrintableTontineCollection = {
                collection: {
                    id: savedCollection.id,
                    amount: savedCollection.amount,
                    date: savedCollection.collectionDate
                },
                member: {
                    frequency: this.selectedMember!.frequency || 'N/A',
                    amount: this.selectedMember!.amount || 0
                },
                client: {
                    fullName: this.selectedMember!.clientName || 'Client Inconnu',
                    phone: this.selectedMember!.client?.phone
                },
                session: {
                    year: this.session!.year
                },
                commercial: {
                    name: this.commercialUsername || 'Commercial'
                },
                totalToDate: availableBalance,
                isOfflineEstimate: savedCollection.isLocal && !savedCollection.isSync
            };

            const modal = await this.modalCtrl.create({
                component: TontineReceiptModalComponent,
                componentProps: {
                    data: receiptData
                }
            });

            await modal.present();
            await modal.onDidDismiss();
            this.navCtrl.back();
        } catch (error) {
            if (await this.loadingCtrl.getTop()) {
                await loading.dismiss();
            }
            throw error;
        }
    }

    formatCurrency(amount?: number): string {
        if (amount === undefined || amount === null) return '0 FCFA';
        return `${amount.toLocaleString('fr-FR')} FCFA`;
    }

    formatDate(date: Date): string {
        return date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    goBack() {
        this.navCtrl.back();
    }

    private isDeliveryCollectionFlow(): boolean {
        return this.route.snapshot.queryParamMap.get('returnToDelivery') === 'true';
    }

    private async showSessionBlockedAlert(deliveryCollection: boolean) {
        const ended = String(this.session?.status || '').trim().toUpperCase() === 'ENDED';
        let header = 'Session clôturée';
        let message = 'Cette session de tontine est clôturée. Les cotisations habituelles ne sont plus possibles. Un complément reste possible seulement lors de la remise des articles.';
        if (deliveryCollection || ended) {
            header = 'Campagne terminée';
            message = deliveryCollection
                ? 'La campagne de tontine est terminée. Aucun complément de solde n\'est possible.'
                : 'La campagne de tontine est terminée. Aucune nouvelle cotisation n\'est possible.';
        }
        const alert = await this.alertCtrl.create({
            header,
            message,
            buttons: [{
                text: 'OK',
                handler: () => {
                    this.goBack();
                }
            }],
            backdropDismiss: false
        });
        await alert.present();
    }

    private async showAlert(header: string, message: string) {
        const alert = await this.alertCtrl.create({
            header,
            message,
            buttons: ['OK']
        });
        await alert.present();
    }

    private generateUuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
