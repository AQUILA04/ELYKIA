import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TontineService } from '../../../services/tontine.service';
import { TontineMember, TontineSocietyShareAdjustment } from '../../../types/tontine.types';

export interface AdjustSocietyShareModalData {
  member: TontineMember;
  /** Etape imposée avant la commande (session en mode obligatoire). */
  mandatory?: boolean;
  /** Affiche « Revenir au calcul automatique » (administrateur, par permission). */
  canReset: boolean;
}

/**
 * Saisie de la part société réelle de l'année. Le formulaire montre le total cotisé, la part du système
 * et le disponible actuel, puis le disponible réel après la saisie. Le serveur compare au montant en place :
 * égal, la part est validée ; différent, il remplace le calcul et le solde disponible est refait.
 */
@Component({
  selector: 'app-adjust-society-share-modal',
  templateUrl: './adjust-society-share-modal.component.html',
  styleUrls: ['./adjust-society-share-modal.component.scss']
})
export class AdjustSocietyShareModalComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  private readonly reference = AdjustSocietyShareModalComponent.newReference();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AdjustSocietyShareModalComponent, TontineSocietyShareAdjustment | null>,
    private tontineService: TontineService,
    @Inject(MAT_DIALOG_DATA) public data: AdjustSocietyShareModalData
  ) {
    this.form = this.fb.group({
      declaredSocietyShare: [null, [Validators.required, Validators.min(0), Validators.max(this.regularContribution)]],
      comment: ['']
    });
  }

  /** Cotisations hors collectes à la livraison : la part ne peut pas les dépasser. */
  get regularContribution(): number {
    const total = this.data.member.totalContribution || 0;
    const delivery = this.data.member.totalDeliveryCollections || 0;
    return Math.max(0, total - delivery);
  }

  /** Part calculée par le système (avant toute saisie). */
  get systemSocietyShare(): number {
    const member = this.data.member;
    return member.societyShareComputed ?? member.societyShare ?? 0;
  }

  get currentAvailable(): number {
    return this.data.member.availableContribution || 0;
  }

  /** Disponible réel si la part saisie est retenue (null tant que rien n'est saisi). */
  get availableAfterEntry(): number | null {
    const raw = this.form.value.declaredSocietyShare;
    if (raw === null || raw === undefined || raw === '' || !Number.isFinite(Number(raw)) || Number(raw) < 0) {
      return null;
    }
    const declared = Math.min(Math.round(Number(raw)), this.regularContribution);
    const currentShare = this.data.member.societyShare || 0;
    return Math.max(0, this.currentAvailable + currentShare - declared);
  }

  get isAdjusted(): boolean {
    return this.data.member.societyShareStatus === 'ADJUSTED';
  }

  getClientName(): string {
    const client = this.data.member.client;
    return `${client.firstname} ${client.lastname}`;
  }

  formatCurrency(value?: number | null): string {
    return `${Math.round(value || 0).toLocaleString('fr-FR')} FCFA`;
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = null;
    this.tontineService.adjustMemberSocietyShare(this.data.member.id, {
      reference: this.reference,
      declaredSocietyShare: Number(this.form.value.declaredSocietyShare),
      comment: (this.form.value.comment || '').trim() || null,
      source: 'WEB_MEMBER'
    }).subscribe({
      next: (response) => this.dialogRef.close(response.data ?? null),
      error: (err) => {
        this.error = err?.message || 'Erreur lors de l\'enregistrement de la part société';
        this.loading = false;
      }
    });
  }

  onReset(): void {
    if (this.loading) {
      return;
    }
    this.loading = true;
    this.error = null;
    this.tontineService.resetMemberSocietyShare(this.data.member.id, (this.form.value.comment || '').trim() || null)
      .subscribe({
        next: (response) => this.dialogRef.close(response.data ?? null),
        error: (err) => {
          this.error = err?.message || 'Erreur lors du retour au calcul automatique';
          this.loading = false;
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  private static newReference(): string {
    const random = Math.random().toString(36).slice(2, 10);
    return `SSA-WEB-${Date.now()}-${random}`;
  }
}
