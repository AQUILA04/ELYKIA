import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { RmPackTontineMember } from '../../../core/services/rm/rm.models';
import { RmTontineFieldControlWriteService } from '../../../core/services/rm/rm-tontine-field-control-write.service';
import { OnlineWriteError } from '../../../core/services/online-first-write.types';

interface MonthRow {
  year: number;
  month: number;
  monthName: string;
  systemAmount: number;
  selected: boolean;
  notebookAmount: number | null;
}

const MONTH_NAMES = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

@Component({
  selector: 'app-rm-tontine-field-control-sheet',
  templateUrl: './rm-tontine-field-control-sheet.component.html',
  styleUrls: ['./rm-tontine-field-control-sheet.component.scss'],
  standalone: false,
})
export class RmTontineFieldControlSheetComponent implements OnInit {
  @Input() member!: RmPackTontineMember;

  rows: MonthRow[] = [];
  note = '';
  submitting = false;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly fieldControlWrite: RmTontineFieldControlWriteService,
    private readonly toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.rows = (this.member?.months || []).map(m => ({
      year: m.year,
      month: m.month,
      monthName: MONTH_NAMES[m.month] || `Mois ${m.month}`,
      systemAmount: m.systemAmount || 0,
      selected: false,
      notebookAmount: null
    }));
  }

  get selectedRows(): MonthRow[] {
    return this.rows.filter(r => r.selected);
  }

  get notebookTotal(): number {
    return this.selectedRows.reduce((sum, r) => sum + (Number(r.notebookAmount) || 0), 0);
  }

  get systemTotal(): number {
    return this.selectedRows.reduce((sum, r) => sum + (r.systemAmount || 0), 0);
  }

  get difference(): number {
    return this.notebookTotal - this.systemTotal;
  }

  get statusLabel(): 'CONFORME' | 'ECART' {
    return Math.abs(this.difference) < 0.0001 ? 'CONFORME' : 'ECART';
  }

  get isValid(): boolean {
    const selected = this.selectedRows;
    if (!selected.length) {
      return false;
    }
    return selected.every(r => r.notebookAmount !== null && Number(r.notebookAmount) >= 0);
  }

  toggleRow(row: MonthRow): void {
    if (this.submitting) {
      return;
    }
    row.selected = !row.selected;
    if (!row.selected) {
      row.notebookAmount = null;
    } else if (row.notebookAmount === null) {
      row.notebookAmount = row.systemAmount;
    }
  }

  dismiss(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  async confirm(): Promise<void> {
    if (!this.isValid || this.submitting || !this.member?.id) {
      return;
    }

    this.submitting = true;
    try {
      const result = await this.fieldControlWrite.create({
        tontineMemberId: this.member.id,
        clientName: this.member.clientName,
        months: this.selectedRows.map(r => ({
          year: r.year,
          month: r.month,
          notebookAmount: Number(r.notebookAmount),
          systemAmount: r.systemAmount
        })),
        note: this.note
      });
      await this.toast(
        result.mode === 'online'
          ? `Contrôle tontine enregistré (${result.op.status})`
          : `Contrôle tontine hors ligne (${result.op.status}) — sync ultérieure`,
        result.mode === 'online' ? 'success' : 'warning'
      );
      await this.modalCtrl.dismiss({ op: result.op, mode: result.mode }, 'confirm');
    } catch (error) {
      await this.toast(
        error instanceof OnlineWriteError || error instanceof Error
          ? error.message
          : 'Échec du contrôle tontine',
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
