import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, LoadingController, ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Subject, BehaviorSubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TontineMemberRepository } from 'src/app/core/repositories/tontine-member.repository';
import { TontineCollectionRepository } from 'src/app/core/repositories/tontine-collection.repository';
import { ClientRepository } from 'src/app/core/repositories/client.repository';
import { TontineMember, TontineCollection, TontineSession } from 'src/app/models/tontine.model';
import { Client } from 'src/app/models/client.model';
import { selectTontineSession } from 'src/app/store/tontine/tontine.selectors';
import * as TontineActions from 'src/app/store/tontine/tontine.actions';
import * as KpiActions from 'src/app/store/kpi/kpi.actions';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { PrintableTontineCollection } from 'src/app/core/services/printing.service';
import { TontineReceiptModalComponent } from 'src/app/shared/components/tontine-receipt-modal/tontine-receipt-modal.component';

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

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private navCtrl: NavController,
        private alertCtrl: AlertController,
        private loadingCtrl: LoadingController,
        private modalCtrl: ModalController,
        private store: Store,
        private memberRepo: TontineMemberRepository,
        private collectionRepo: TontineCollectionRepository,
        private clientRepo: ClientRepository
    ) {
        this.initializeForm();
    }

    async ngOnInit() {
        // Get current session
        this.store.select(selectTontineSession)
            .pipe(takeUntil(this.destroy$))
            .subscribe(async session => {
                if (session) {
                    this.session = session;

                    // Check session status
                    if (session.status === 'CLOSED') {
                        await this.showSessionClosedAlert();
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
                                this.collectionForm.patchValue({ amount: parseFloat(preFilledAmount) });
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
            return;
        }

        if (!this.commercialUsername) {
            this.showAlert('Erreur', 'Utilisateur non trouvé. Veuillez réessayer.');
            return;
        }

        const loading = await this.loadingCtrl.create({
            message: 'Enregistrement en cours...'
        });
        await loading.present();

        try {
            const formValue = this.collectionForm.value;

            const returnToDelivery = this.route.snapshot.queryParamMap.get('returnToDelivery') === 'true';

            const newCollection: TontineCollection = {
                id: this.generateUuid(),
                tontineMemberId: this.selectedMember.id,
                amount: formValue.amount,
                collectionDate: new Date().toISOString(), // Always use current date
                commercialUsername: this.commercialUsername,
                isLocal: true,
                isSync: false,
                isDeliveryCollection: returnToDelivery
            };

            await this.collectionRepo.save(newCollection);

            // Update Store specifically for Dashboard KPI
            this.store.dispatch(TontineActions.loadTontineCollections());

            // Refresh Tontine KPI for dashboard
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const endDate = now.toISOString().split('T')[0];
            const dateFilter = { startDate, endDate };
            this.store.dispatch(KpiActions.loadTontineSummaryKpi({
                commercialUsername: this.commercialUsername!,
                dateFilter
            }));

            await loading.dismiss();

            // Calculate total collected to date including this new collection
            const memberCollections = await this.collectionRepo.getByMemberId(this.selectedMember.id);
            const totalToDate = memberCollections.reduce((sum, c) => sum + (c.amount || 0), 0);

            // Prepare receipt data
            const receiptData: PrintableTontineCollection = {
                collection: {
                    id: newCollection.id,
                    amount: newCollection.amount,
                    date: newCollection.collectionDate
                },
                member: {
                    frequency: this.selectedMember.frequency || 'N/A',
                    amount: this.selectedMember.amount || 0
                },
                client: {
                    fullName: this.selectedMember.clientName || 'Client Inconnu',
                    phone: this.selectedMember.client?.phone
                },
                session: {
                    year: this.session!.year
                },
                commercial: {
                    name: this.commercialUsername || 'Commercial'
                },
                totalToDate: totalToDate
            };

            // Open receipt modal
            const modal = await this.modalCtrl.create({
                component: TontineReceiptModalComponent,
                componentProps: {
                    data: receiptData
                }
            });

            await modal.present();

            // Wait for modal to be dismissed, then navigate back
            await modal.onDidDismiss();
            this.navCtrl.back();

        } catch (error) {
            await loading.dismiss();
            console.error('Error saving collection:', error);
            this.showAlert('Erreur', 'Une erreur est survenue lors de l\'enregistrement.');
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

    private async showSessionClosedAlert() {
        const alert = await this.alertCtrl.create({
            header: 'Session Clôturée',
            message: 'Cette session de tontine est clôturée ou terminée. Aucune nouvelle collecte n\'est possible.',
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
