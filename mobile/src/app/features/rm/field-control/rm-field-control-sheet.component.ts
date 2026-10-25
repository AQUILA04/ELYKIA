import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { RmCreditLate } from '../../../core/services/rm/rm.models';
import { RmFieldControlWriteService } from '../../../core/services/rm/rm-field-control-write.service';
import { OnlineWriteError } from '../../../core/services/online-first-write.types';
import { fitNotebookDays, MISE_DAY_STEP, misesTotal } from '../../../shared/components/mise-day-pills/mise-day-pills.logic';

export interface RmPreviousFieldControl {
  status?: string;
  differenceAmount?: number;
  notebookTotalAmount?: number;
  note?: string;
  ecartDecisionStatus?: string | null;
  modifiable?: boolean;
}

@Component({
  selector: 'app-rm-field-control-sheet',
  templateUrl: './rm-field-control-sheet.component.html',
  styleUrls: ['./rm-field-control-sheet.component.scss'],
  standalone: false,
})
export class RmFieldControlSheetComponent implements OnInit {
  @Input() credit!: RmCreditLate;
  @Input() previous: RmPreviousFieldControl | null = null;

  usePills = true;
  maxDays = MISE_DAY_STEP;
  selectedUpTo: number | null = null;
  observedAdvance: number | null = 0;
  manualNotebook: number | null = null;
  note = '';
  submitting = false;
  amountError: string | null = null;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly fieldControlWrite: RmFieldControlWriteService,
    private readonly toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.note = this.modifying ? (this.previous?.note || '') : '';
    this.usePills = this.dailyStake > 0;
    this.observedAdvance = this.systemAdvance;

    const target = this.modifying && this.previous?.notebookTotalAmount != null
      ? this.previous.notebookTotalAmount
      : this.systemPaid;

    if (!this.usePills) {
      this.manualNotebook = target;
      return;
    }

    const fit = fitNotebookDays(target, this.systemAdvance, this.dailyStake);
    if (fit.exact) {
      this.selectedUpTo = fit.days;
      this.maxDays = fit.maxDays;
    }
  }

  get modifying(): boolean {
    if (!this.previous) {
      return false;
    }
    if (typeof this.previous.modifiable === 'boolean') {
      return this.previous.modifiable;
    }
    if (this.previous.status !== 'ECART') {
      return false;
    }
    return !this.previous.ecartDecisionStatus || this.previous.ecartDecisionStatus === 'PENDING';
  }

  get dailyStake(): number {
    return this.credit?.dailyStake ?? 0;
  }

  get creditTotal(): number {
    return this.credit?.totalAmount ?? 0;
  }

  get systemAdvance(): number {
    return this.credit?.advance ?? 0;
  }

  get systemPaid(): number {
    return this.credit?.totalAmountPaid ?? 0;
  }

  get observedAdvanceValue(): number {
    const value = Number(this.observedAdvance);
    return Number.isNaN(value) ? 0 : value;
  }

  get misesAmount(): number {
    return misesTotal(this.selectedUpTo, this.dailyStake);
  }

  get notebookTotal(): number {
    if (!this.usePills) {
      const value = Number(this.manualNotebook);
      return Number.isNaN(value) ? 0 : value;
    }
    return this.misesAmount + this.observedAdvanceValue;
  }

  get advanceMatches(): boolean {
    return Math.abs(this.observedAdvanceValue - this.systemAdvance) < 0.0001;
  }

  get difference(): number {
    return this.notebookTotal - this.systemPaid;
  }

  get statusLabel(): 'CONFORME' | 'ECART' {
    return Math.abs(this.difference) < 0.0001 ? 'CONFORME' : 'ECART';
  }

  get isValid(): boolean {
    if (this.usePills) {
      const advance = Number(this.observedAdvance);
      return this.selectedUpTo !== null && !Number.isNaN(advance) && advance >= 0;
    }
    const value = Number(this.manualNotebook);
    return this.manualNotebook !== null && this.manualNotebook !== undefined && !Number.isNaN(value) && value >= 0;
  }

  onDaysSelected(days: number | null): void {
    this.selectedUpTo = days;
    this.validate();
  }

  onDaysExtended(maxDays: number): void {
    this.maxDays = maxDays;
  }

  validate(): void {
    if (!this.usePills) {
      const value = Number(this.manualNotebook);
      if (this.manualNotebook === null || this.manualNotebook === undefined || Number.isNaN(value)) {
        this.amountError = 'Montant carnet requis';
      } else if (value < 0) {
        this.amountError = 'Le montant doit être ≥ 0';
      } else {
        this.amountError = null;
      }
      return;
    }

    const advance = Number(this.observedAdvance);
    if (this.observedAdvance === null || this.observedAdvance === undefined || Number.isNaN(advance)) {
      this.amountError = 'Avance requise';
    } else if (advance < 0) {
      this.amountError = "L'avance doit être ≥ 0";
    } else if (this.selectedUpTo === null) {
      this.amountError = 'Sélectionnez le dernier jour coché';
    } else {
      this.amountError = null;
    }
  }

  dismiss(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  async confirm(): Promise<void> {
    this.validate();
    if (!this.isValid || this.submitting) {
      return;
    }

    this.submitting = true;
    try {
      const result = await this.fieldControlWrite.create({
        creditId: this.credit.id,
        notebookTotalAmount: this.notebookTotal,
        systemTotalAmountPaid: this.systemPaid,
        note: this.note,
        clientName: this.credit.clientName,
        creditReference: this.credit.reference
      });
      const verb = this.modifying ? 'modifié' : 'enregistré';
      await this.toast(
        result.mode === 'online'
          ? `Contrôle ${verb} (${result.op.status})`
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
