import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TontineMemberRepository } from 'src/app/core/repositories/tontine-member.repository';
import { ClientSelectorModalComponent } from 'src/app/shared/components/client-selector-modal/client-selector-modal.component';
import { Client } from 'src/app/models/client.model';
import { TontineMember } from 'src/app/models/tontine.model';
import { selectTontineSession } from 'src/app/store/tontine/tontine.selectors';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { loadTontineMembers } from 'src/app/store/tontine/tontine.actions';

@Component({
    selector: 'app-member-registration',
    templateUrl: './member-registration.page.html',
    styleUrls: ['./member-registration.page.scss'],
    standalone: false
})
export class MemberRegistrationPage implements OnInit, OnDestroy {
    registrationForm!: FormGroup;
    selectedClient: Client | null = null;
    private destroy$ = new Subject<void>();
    private sessionId: string | null = null;
    private commercialUsername: string | null = null;

    frequencyOptions = [
        { value: 'DAILY', label: 'Quotidien' },
        { value: 'WEEKLY', label: 'Hebdomadaire' },
        { value: 'MONTHLY', label: 'Mensuel' }
    ];

    constructor(
        private fb: FormBuilder,
        private navCtrl: NavController,
        private modalCtrl: ModalController,
        private alertCtrl: AlertController,
        private loadingCtrl: LoadingController,
        private store: Store,
        private tontineMemberRepo: TontineMemberRepository
    ) {
        this.initializeForm();
    }

    ngOnInit() {
        // Get current session
        this.store.select(selectTontineSession)
            .pipe(takeUntil(this.destroy$))
            .subscribe(session => {
                if (session) {
                    this.sessionId = session.id;
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
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initializeForm() {
        this.registrationForm = this.fb.group({
            frequency: ['DAILY', Validators.required],
            amount: [null, [Validators.required, Validators.min(0)]],
            notes: ['']
        });
    }

    async selectClient() {
        const modal = await this.modalCtrl.create({
            component: ClientSelectorModalComponent,
            componentProps: {
                filterByTontineCollector: this.commercialUsername
            }
        });

        await modal.present();

        const { data } = await modal.onWillDismiss();
        if (data && data.client) {
            this.selectedClient = data.client;
        }
    }

    removeClient() {
        this.selectedClient = null;
    }

    getClientDisplayName(): string {
        if (!this.selectedClient) return '';
        return this.selectedClient.fullName ||
            `${this.selectedClient.firstname || ''} ${this.selectedClient.lastname || ''}`.trim();
    }

    getClientInfo(): string {
        if (!this.selectedClient) return '';
        const parts = [this.selectedClient.phone, this.selectedClient.quarter].filter(Boolean);
        return parts.join(' • ');
    }


    async onSubmit() {
        if (!this.selectedClient) {
            const alert = await this.alertCtrl.create({
                header: 'Client requis',
                message: 'Veuillez sélectionner un client pour continuer.',
                buttons: ['OK']
            });
            await alert.present();
            return;
        }

        if (this.registrationForm.invalid) {
            this.registrationForm.markAllAsTouched();
            return;
        }

        if (!this.sessionId || !this.commercialUsername) {
            const alert = await this.alertCtrl.create({
                header: 'Erreur',
                message: 'Session ou utilisateur non trouvé. Veuillez réessayer.',
                buttons: ['OK']
            });
            await alert.present();
            return;
        }

        const loading = await this.loadingCtrl.create({
            message: 'Enregistrement en cours...'
        });
        await loading.present();

        try {
            // Check if client is already registered in this session
            const clientExists = await this.tontineMemberRepo.checkClientExists(
                this.sessionId,
                this.selectedClient.id
            );

            if (clientExists) {
                await loading.dismiss();

                const alert = await this.alertCtrl.create({
                    header: 'Client déjà enregistré',
                    message: `${this.getClientDisplayName()} est déjà membre de cette session de tontine. Un client ne peut être enregistré qu'une seule fois par session.`,
                    buttons: ['OK']
                });
                await alert.present();
                return;
            }

            const formValue = this.registrationForm.value;

            const newMember: TontineMember = {
                id: this.generateUuid(),
                tontineSessionId: this.sessionId,
                clientId: this.selectedClient.id,
                commercialUsername: this.commercialUsername,
                totalContribution: 0,
                deliveryStatus: 'PENDING',
                registrationDate: new Date().toISOString(),
                isLocal: true,
                isSync: false,
                frequency: formValue.frequency,
                amount: formValue.amount,
                notes: formValue.notes || null
            };

            await this.tontineMemberRepo.save(newMember);

            await loading.dismiss();

            // Reload members list to reflect the new member
            this.store.dispatch(loadTontineMembers({ sessionId: this.sessionId }));

            const alert = await this.alertCtrl.create({
                header: 'Succès',
                message: 'Le membre a été enregistré avec succès.',
                buttons: [{
                    text: 'OK',
                    handler: () => {
                        this.navCtrl.back();
                    }
                }]
            });
            await alert.present();

        } catch (error) {
            await loading.dismiss();
            console.error('Error saving tontine member:', error);

            const alert = await this.alertCtrl.create({
                header: 'Erreur',
                message: 'Une erreur est survenue lors de l\'enregistrement. Veuillez réessayer.',
                buttons: ['OK']
            });
            await alert.present();
        }
    }

    goBack() {
        this.navCtrl.back();
    }

    private generateUuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
