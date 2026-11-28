import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';

/** Montants affichés dans le formulaire de réajustement de la part société. */
export interface TontineSocietyShareFormData {
  clientName?: string;
  /** Total cotisé hors collectes de livraison (la part ne peut pas le dépasser). */
  regularContribution: number;
  /** Part calculée par le système, avant toute saisie. */
  systemSocietyShare: number;
  /** Part en place (calculée, validée ou corrigée). */
  currentSocietyShare: number;
  /** Solde disponible en place. */
  currentAvailable: number;
  /** Etape imposée avant la commande ou la livraison directe. */
  mandatory?: boolean;
  /** Libellé du bouton d'enregistrement. */
  submitLabel?: string;
}

export interface TontineSocietyShareFormResult {
  amount: number;
  comment: string | null;
}

/** Disponible réel si la part saisie est retenue (même règle que le serveur, plafonnée au total cotisé). */
export function availableAfterSocietyShare(data: TontineSocietyShareFormData, declared: number): number {
  const capped = Math.min(Math.max(0, Math.round(declared)), Math.max(0, data.regularContribution));
  return Math.max(0, (data.currentAvailable || 0) + (data.currentSocietyShare || 0) - capped);
}

/**
 * Formulaire de réajustement de la part société : total cotisé, part du système, disponible actuel,
 * part réelle de l'année, note d'observation, puis disponible réel après la saisie.
 * Renvoie `{ amount, comment }` (rôle `confirm`) ou rien si l'utilisateur annule.
 */
@Component({
  selector: 'app-tontine-society-share-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './tontine-society-share-modal.component.html',
  styleUrls: ['./tontine-society-share-modal.component.scss']
})
export class TontineSocietyShareModalComponent {
  @Input() data!: TontineSocietyShareFormData;

  amount: number | string | null = null;
  comment = '';
  error: string | null = null;

  constructor(private readonly modalCtrl: ModalController) {}

  get declared(): number | null {
    if (this.amount === null || this.amount === undefined || String(this.amount).trim() === '') {
      return null;
    }
    const value = Number(this.amount);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  get availableAfter(): number | null {
    const declared = this.declared;
    return declared === null ? null : availableAfterSocietyShare(this.data, declared);
  }

  format(value: number | null | undefined): string {
    return `${Math.round(value || 0).toLocaleString('fr-FR')} FCFA`;
  }

  cancel(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  save(): void {
    const declared = this.declared;
    if (declared === null) {
      this.error = 'Saisissez la part société réelle de l\'année.';
      return;
    }
    if (declared > (this.data.regularContribution || 0) + 1) {
      this.error = `La part société ne peut pas dépasser le total cotisé (${this.format(this.data.regularContribution)}).`;
      return;
    }
    const result: TontineSocietyShareFormResult = {
      amount: Math.round(declared),
      comment: this.comment.trim() || null
    };
    void this.modalCtrl.dismiss(result, 'confirm');
  }
}

/** Ouvre le formulaire ; renvoie la saisie, ou null si l'utilisateur annule. */
export async function openSocietyShareForm(
  modalCtrl: ModalController,
  data: TontineSocietyShareFormData
): Promise<TontineSocietyShareFormResult | null> {
  const modal = await modalCtrl.create({
    component: TontineSocietyShareModalComponent,
    componentProps: { data },
    backdropDismiss: !data.mandatory,
    cssClass: 'elyk-society-share-modal'
  });
  await modal.present();
  const { data: result, role } = await modal.onDidDismiss<TontineSocietyShareFormResult>();
  return role === 'confirm' && result ? result : null;
}
