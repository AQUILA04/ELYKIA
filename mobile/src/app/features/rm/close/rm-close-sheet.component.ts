import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { RmCreditLate } from '../../../core/services/rm/rm.models';
import { RmCloseWriteService } from '../../../core/services/rm/rm-close-write.service';
import { OnlineWriteError } from '../../../core/services/online-first-write.types';

@Component({
  selector: 'app-rm-close-sheet',
  templateUrl: './rm-close-sheet.component.html',
  styleUrls: ['./rm-close-sheet.component.scss'],
  standalone: false,
})
export class RmCloseSheetComponent implements OnInit {
  @Input() credit!: RmCreditLate;

  isPartial = false;
  amount = 0;
  amountError: string | null = null;
  submitting = false;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly closeWrite: RmCloseWriteService,
    private readonly toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.amount = this.netDue;
  }

  get remaining(): number {
    return this.credit?.totalAmountRemaining ?? 0;
  }

  get reliquat(): number {
    return this.credit?.clientReliquatApplied ?? 0;
  }

  get netDue(): number {
    return Math.max(0, this.remaining);
  }

  get halfAmount(): number {
    return Math.max(1, Math.floor(this.netDue / 2));
  }

  get chip10kVisible(): boolean {
    return this.netDue > 10000;
  }

  get isValid(): boolean {
    if (this.amountError) {
      return false;
    }
    if (this.netDue === 0) {
      return !this.isPartial && this.amount === 0;
    }
    if (this.isPartial) {
      return this.amount > 0 && this.amount < this.netDue;
    }
    return this.amount >= 0 && this.amount <= this.netDue;
  }

  onPartialToggle(): void {
    if (!this.isPartial) {
      this.amount = this.netDue;
    }
    this.validateAmount();
  }

  setTotal(): void {
    this.isPartial = false;
    this.amount = this.netDue;
    this.validateAmount();
  }

  setPartial(): void {
    this.isPartial = true;
    if (this.amount >= this.netDue) {
      this.amount = this.halfAmount;
    }
    this.validateAmount();
  }

  setChip(value: number): void {
    this.isPartial = value < this.netDue;
    this.amount = Math.min(value, Math.max(0, this.netDue - (this.isPartial ? 1 : 0)));
    if (!this.isPartial) {
      this.amount = this.netDue;
    }
    this.validateAmount();
  }

  validateAmount(): void {
    this.amount = Number(this.amount);
    if (Number.isNaN(this.amount)) {
      this.amount = 0;
    }
    if (this.netDue === 0) {
      this.amountError = this.isPartial
        ? 'Partiel impossible : restant déjà à 0'
        : null;
      return;
    }
    if (this.amount <= 0) {
      this.amountError = 'Le montant doit être supérieur à 0';
    } else if (this.isPartial && this.amount >= this.netDue) {
      this.amountError = 'Le partiel doit être inférieur au restant';
    } else if (this.amount > this.netDue) {
      this.amountError = 'Montant supérieur au restant';
    } else {
      this.amountError = null;
    }
  }

  dismiss(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  async confirm(): Promise<void> {
    this.validateAmount();
    if (!this.isValid || this.submitting) {
      return;
    }

    this.submitting = true;
    try {
      const result = await this.closeWrite.closeCredit({
        creditId: this.credit.id,
        amount: this.amount,
        isPartial: this.isPartial,
        clientName: this.credit.clientName,
        creditReference: this.credit.reference,
        commercialUsername: this.credit.collector,
        clientReliquatApplied: this.credit.clientReliquatApplied,
        originalRemaining: this.credit.totalAmountRemaining
      });

      await this.toast(
        result.mode === 'online'
          ? 'Clôture enregistrée sur le serveur'
          : 'Clôture enregistrée hors ligne — sync ultérieure',
        result.mode === 'online' ? 'success' : 'warning'
      );
      await this.modalCtrl.dismiss({ op: result.op, mode: result.mode }, 'confirm');
    } catch (error) {
      await this.toast(
        error instanceof OnlineWriteError || error instanceof Error
          ? error.message
          : 'Échec de la clôture',
        'danger'
      );
    } finally {
      this.submitting = false;
    }
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0));
  }

  private async toast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2800, color, position: 'top' });
    await t.present();
  }
}
