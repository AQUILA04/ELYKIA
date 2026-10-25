import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { LoggerService } from '../../../core/services/logger.service';
import { RmPackTontineCollector, RmPackTontineFieldControlToday, RmPackTontineMember } from '../../../core/services/rm/rm.models';
import { RmTontineFieldControlWriteService } from '../../../core/services/rm/rm-tontine-field-control-write.service';
import { OnlineWriteError } from '../../../core/services/online-first-write.types';
import { TontineControlDebug } from './rm-tontine-control-debug';
import { fitNotebookDays, MISE_DAY_STEP } from '../../../shared/components/mise-day-pills/mise-day-pills.logic';

interface MonthRow {
  year: number;
  month: number;
  monthName: string;
  commercialUsername: string;
  systemAmount: number;
  selected: boolean;
  notebookAmount: number | null;
  selectedUpTo: number | null;
  maxDays: number;
  useManual: boolean;
}

interface CollectorBlock {
  commercialUsername: string;
  currentCollector: boolean;
  totalAmount: number;
  rows: MonthRow[];
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
export class RmTontineFieldControlSheetComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() member!: RmPackTontineMember;
  @Input() modifying = false;
  @Input() latestControl: RmPackTontineFieldControlToday | null = null;
  private readonly debug: TontineControlDebug;

  blocks: CollectorBlock[] = [];
  /** Pack ancien sans collectors : formulaire unique non découpé. */
  legacyMode = false;
  note = '';
  submitting = false;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly fieldControlWrite: RmTontineFieldControlWriteService,
    private readonly toastCtrl: ToastController,
    private readonly host: ElementRef<HTMLElement>,
    log: LoggerService,
    zone: NgZone
  ) {
    this.debug = new TontineControlDebug(log, zone);
  }

  ngOnInit(): void {
    const months = (this.member?.months || []).length;
    const collectors = (this.member?.collectors || []).length;
    this.debug.start(`member=${this.member?.id ?? '-'} months=${months} collectors=${collectors}`);
    const collectorList = this.member?.collectors;
    if (Array.isArray(collectorList) && collectorList.length > 0) {
      this.legacyMode = false;
      this.blocks = collectorList.map(c => this.toBlock(c));
      this.debug.event(`blocks=${this.blocks.length} rows=${this.allRows.length} legacy=false`);
      this.prefillPreviousControl();
      return;
    }

    this.legacyMode = true;
    const commercial = (this.member?.tontineCollector || 'Commercial').trim();
    this.blocks = [{
      commercialUsername: commercial,
      currentCollector: true,
      totalAmount: (this.member?.months || []).reduce((s, m) => s + (m.systemAmount || 0), 0),
      rows: (this.member?.months || []).map(m => this.toRow(commercial, m.year, m.month, m.systemAmount || 0))
    }];
    this.debug.event(`blocks=${this.blocks.length} rows=${this.allRows.length} legacy=true`);
    this.prefillPreviousControl();
  }

  ngAfterViewInit(): void {
    this.debug.attachScroll(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.debug.stop('destroy');
  }

  get allRows(): MonthRow[] {
    return this.blocks.reduce((rows: MonthRow[], block) => rows.concat(block.rows), []);
  }

  get selectedRows(): MonthRow[] {
    return this.allRows.filter(r => r.selected);
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

  get dailyMise(): number {
    const amount = Number(this.member?.amount);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }

  get isValid(): boolean {
    const selected = this.selectedRows;
    if (!selected.length) {
      return false;
    }
    return selected.every(r => this.rowReady(r));
  }

  blockSelectedRows(block: CollectorBlock): MonthRow[] {
    return block.rows.filter(r => r.selected);
  }

  blockSystemTotal(block: CollectorBlock): number {
    return this.blockSelectedRows(block).reduce((sum, r) => sum + (r.systemAmount || 0), 0);
  }

  blockNotebookTotal(block: CollectorBlock): number {
    return this.blockSelectedRows(block).reduce((sum, r) => sum + (Number(r.notebookAmount) || 0), 0);
  }

  blockDifference(block: CollectorBlock): number {
    return this.blockNotebookTotal(block) - this.blockSystemTotal(block);
  }

  blockStatus(block: CollectorBlock): 'CONFORME' | 'ECART' | null {
    if (!this.blockSelectedRows(block).length) {
      return null;
    }
    return Math.abs(this.blockDifference(block)) < 0.0001 ? 'CONFORME' : 'ECART';
  }

  toggleRow(row: MonthRow): void {
    this.debug.event(`toggle ${row.monthName} ${row.year} selected=${!row.selected} submitting=${this.submitting}`);
    if (this.submitting) {
      return;
    }
    row.selected = !row.selected;
    if (!row.selected) {
      this.resetRowAmount(row);
      return;
    }
    if (row.useManual && row.notebookAmount === null) {
      row.notebookAmount = row.systemAmount;
    }
  }

  onDaysSelected(row: MonthRow, days: number | null): void {
    row.selectedUpTo = days;
    row.notebookAmount = days === null ? null : days * this.dailyMise;
  }

  onDaysExtended(row: MonthRow, maxDays: number): void {
    row.maxDays = maxDays;
  }

  dismiss(): void {
    this.debug.event('dismiss');
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  async confirm(): Promise<void> {
    if (!this.isValid || this.submitting || !this.member?.id) {
      return;
    }

    this.debug.event(`confirm rows=${this.selectedRows.length}`);
    this.submitting = true;
    try {
      const result = await this.fieldControlWrite.create({
        tontineMemberId: this.member.id,
        clientName: this.member.clientName,
        months: this.selectedRows.map(r => ({
          year: r.year,
          month: r.month,
          commercialUsername: r.commercialUsername,
          notebookAmount: Number(r.notebookAmount),
          systemAmount: r.systemAmount
        })),
        note: this.note
      });
      const verb = this.modifying ? 'modifié' : 'enregistré';
      await this.toast(
        result.mode === 'online'
          ? `Contrôle tontine ${verb} (${result.op.status})`
          : `Contrôle tontine hors ligne (${result.op.status}) — sync ultérieure`,
        result.mode === 'online' ? 'success' : 'warning'
      );
      this.debug.event(`confirm ok mode=${result.mode} status=${result.op.status}`);
      await this.modalCtrl.dismiss({ op: result.op, mode: result.mode }, 'confirm');
    } catch (error) {
      this.debug.event(`confirm error ${error instanceof Error ? error.message : 'unknown'}`);
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

  private toBlock(collector: RmPackTontineCollector): CollectorBlock {
    const commercial = (collector.commercialUsername || '').trim();
    return {
      commercialUsername: commercial,
      currentCollector: collector.currentCollector === true,
      totalAmount: collector.totalAmount || 0,
      rows: (collector.months || []).map(m =>
        this.toRow(commercial, m.year, m.month, m.systemAmount || 0))
    };
  }

  private prefillPreviousControl(): void {
    if (!this.modifying || !this.latestControl?.lines?.length) {
      return;
    }
    this.note = this.latestControl.note || '';
    for (const line of this.latestControl.lines) {
      const row = this.allRows.find(candidate =>
        candidate.year === line.year
        && candidate.month === line.month
        && candidate.commercialUsername.toLowerCase() === (line.commercialUsername || '').trim().toLowerCase());
      if (!row) {
        continue;
      }
      row.selected = true;
      this.applyNotebook(row, line.notebookAmount);
    }
  }

  private rowReady(row: MonthRow): boolean {
    if (!row.commercialUsername || row.notebookAmount === null || Number(row.notebookAmount) < 0) {
      return false;
    }
    if (row.useManual) {
      return true;
    }
    return row.selectedUpTo !== null;
  }

  private resetRowAmount(row: MonthRow): void {
    row.notebookAmount = null;
    row.selectedUpTo = null;
    row.maxDays = MISE_DAY_STEP;
  }

  private applyNotebook(row: MonthRow, notebookAmount: number): void {
    if (row.useManual) {
      row.notebookAmount = notebookAmount;
      return;
    }
    const fit = fitNotebookDays(notebookAmount, 0, this.dailyMise);
    if (!fit.exact) {
      row.useManual = true;
      row.notebookAmount = notebookAmount;
      return;
    }
    row.selectedUpTo = fit.days;
    row.maxDays = fit.maxDays;
    row.notebookAmount = fit.days * this.dailyMise;
  }

  private toRow(
      commercialUsername: string,
      year: number,
      month: number,
      systemAmount: number): MonthRow {
    return {
      year,
      month,
      monthName: MONTH_NAMES[month] || `Mois ${month}`,
      commercialUsername,
      systemAmount,
      selected: false,
      notebookAmount: null,
      selectedUpTo: null,
      maxDays: MISE_DAY_STEP,
      useManual: this.dailyMise <= 0
    };
  }

  private async toast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2800, color, position: 'top' });
    await t.present();
  }
}
