import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { RmCreditLate } from '../../../core/services/rm/rm.models';
import { RmFieldControlWriteService } from '../../../core/services/rm/rm-field-control-write.service';
import { OnlineWriteError } from '../../../core/services/online-first-write.types';

@Component({
  selector: 'app-rm-field-control-sheet',
  templateUrl: './rm-field-control-sheet.component.html',
  styleUrls: ['./rm-field-control-sheet.component.scss'],
  standalone: false,
})
export class RmFieldControlSheetComponent implements OnInit {
  @Input() credit!: RmCreditLate;

  notebookTotalAmount: number | null = null;
  note = '';
  submitting = false;
  amountError: string | null = null;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly fieldControlWrite: RmFieldControlWriteService,
    private readonly toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.notebookTotalAmount = this.systemPaid;
  }

  get systemPaid(): number {
    return this.credit?.totalAmountPaid ?? 0;
  }

  get difference(): number {
    const notebook = Number(this.notebookTotalAmount);
    if (Number.isNaN(notebook)) {
      return 0;
    }
    return notebook - this.systemPaid;
  }

  get statusLabel(): 'CONFORME' | 'ECART' {
    return Math.abs(this.difference) < 0.0001 ? 'CONFORME' : 'ECART';
  }

  get isValid(): boolean {
    const value = Number(this.notebookTotalAmount);
    return !Number.isNaN(value) && value >= 0 && !this.amountError;
  }

  validate(): void {
    const value = Number(this.notebookTotalAmount);
    if (this.notebookTotalAmount === null || this.notebookTotalAmount === undefined || Number.isNaN(value)) {
      this.amountError = 'Montant carnet requis';
    } else if (value < 0) {
      this.amountError = 'Le montant doit être ≥ 0';
    } else {
      this.amountError = null;
    }
  }

  dismiss(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  async confirm(): Promise<void> {
    this.validate();
    if (!this.isValid || this.submitting || this.notebookTotalAmount === null) {
      return;
    }

    this.submitting = true;
    try {
      const result = await this.fieldControlWrite.create({
        creditId: this.credit.id,
        notebookTotalAmount: Number(this.notebookTotalAmount),
        systemTotalAmountPaid: this.systemPaid,
        note: this.note,
        clientName: this.credit.clientName,
        creditReference: this.credit.reference
      });
      await this.toast(
        result.mode === 'online'
          ? `Contrôle enregistré (${result.op.status})`
          : `Contrôle hors ligne (${result.op.status}) — sync ultérieure`,
        result.mode === 'online' ? 'success' : 'warning'
      );
      await this.modalCtrl.dismiss({ op: result.op, mode: result.mode }, 'confirm');
    } catch (error) {
      await this.toast(
        error instanceof OnlineWriteError || error instanceof Error
          ? error.message
          : 'Échec du contrôle',
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
