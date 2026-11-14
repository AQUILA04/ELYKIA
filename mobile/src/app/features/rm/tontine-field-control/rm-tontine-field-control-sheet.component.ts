import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { LoggerService } from '../../../core/services/logger.service';
import { RmCommercialRef, RmPackTontineCollector, RmPackTontineFieldControlToday, RmPackTontineMember } from '../../../core/services/rm/rm.models';
import { RmTontineFieldControlWriteService } from '../../../core/services/rm/rm-tontine-field-control-write.service';
import { RmCollectorAssignApiService } from '../../../core/services/rm/rm-collector-assign-api.service';
import { OnlineWriteError } from '../../../core/services/online-first-write.types';
import { TontineControlDebug } from './rm-tontine-control-debug';
import { fitNotebookDays, maxDaysAfterSelection, MISE_DAY_STEP } from '../../../shared/components/mise-day-pills/mise-day-pills.logic';
import { resolveMonthMise } from './rm-tontine-month-mise';

interface MonthRow {
  year: number;
  month: number;
  monthName: string;
  blockCommercial: string;
  commercialUsername: string;
  systemAmount: number;
  applicableMise: number;
  dailyMise: number;
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
  @Input() promoters: RmCommercialRef[] = [];
  private readonly debug: TontineControlDebug;

  blocks: CollectorBlock[] = [];
  promoterOptions: RmCommercialRef[] = [];
  /** Pack ancien sans collectors : formulaire unique non découpé. */
  legacyMode = false;
  note = '';
  submitting = false;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly fieldControlWrite: RmTontineFieldControlWriteService,
    private readonly promotersApi: RmCollectorAssignApiService,
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
    this.promoterOptions = (this.promoters || []).filter(promoter => !!promoter?.username);
    void this.promotersApi.listPromoters().then(live => {
      if (live.length) {
        this.promoterOptions = live.map(promoter => ({
          username: promoter.username,
          displayName: promoter.displayName || promoter.username
        }));
      }
    }).catch(() => undefined);
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
      rows: (this.member?.months || []).map(m =>
        this.toRow(commercial, m.year, m.month, m.systemAmount || 0, m.dailyAmount))
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

  canEditAttribution(row: MonthRow): boolean {
    return row.systemAmount <= 0 && !this.monthCollectedElsewhere(row);
  }

  promotersFor(row: MonthRow): RmCommercialRef[] {
    const options = [...this.promoterOptions];
    if (row.commercialUsername && !options.some(option =>
      option.username.toLowerCase() === row.commercialUsername.toLowerCase())) {
      options.unshift({ username: row.commercialUsername, displayName: row.commercialUsername });
    }
    return options;
  }

  toggleRow(row: MonthRow): void {
    this.debug.event(`toggle ${row.monthName} ${row.year} selected=${!row.selected} submitting=${this.submitting}`);
    if (this.submitting || (this.monthCollectedElsewhere(row) && !row.selected)) {
      return;
    }
    row.selected = !row.selected;
    if (!row.selected) {
      this.resetRowAmount(row);
      row.commercialUsername = row.blockCommercial;
      row.dailyMise = row.applicableMise;
      return;
    }
    if (row.useManual && row.notebookAmount === null) {
      row.notebookAmount = row.systemAmount;
    }
    this.releaseEmptyMonth(row);
  }

  onCommercialChange(row: MonthRow, username: string): void {
    row.commercialUsername = username || row.blockCommercial;
    this.releaseEmptyMonth(row);
  }

  onMiseChange(row: MonthRow, value: string | number | null): void {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 0) {
      return;
    }
    row.dailyMise = next;
    if (!row.useManual && row.selectedUpTo != null) {
      row.notebookAmount = row.selectedUpTo * next;
    }
  }

  onDaysSelected(row: MonthRow, days: number | null): void {
    row.selectedUpTo = days;
    row.notebookAmount = days === null ? null : days * row.dailyMise;
    row.maxDays = maxDaysAfterSelection(days, row.maxDays);
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
          systemAmount: r.systemAmount,
          declaredDailyAmount: this.stakeToSend(r)
        })),
        note: this.note
      });
      const verb = this.modifying ? 'modifié' : 'enregistré';
      const newlyVerified = result.op.carnetVerified === true && this.member?.carnetVerified !== true;
      const verifiedNote = newlyVerified ? ' Carnet vérifié.' : '';
      await this.toast(
        result.mode === 'online'
          ? `Contrôle tontine ${verb} (${result.op.status}).${verifiedNote}`
          : `Contrôle tontine hors ligne (${result.op.status}) — sync ultérieure.${verifiedNote}`,
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
        this.toRow(commercial, m.year, m.month, m.systemAmount || 0, m.dailyAmount))
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
    if (this.canEditAttribution(row) && !(row.dailyMise > 0)) {
      return false;
    }
    if (row.useManual) {
      return true;
    }
    return row.selectedUpTo !== null;
  }

  private stakeToSend(row: MonthRow): number | undefined {
    if (!this.canEditAttribution(row)) {
      return undefined;
    }
    if (Math.abs(row.dailyMise - row.applicableMise) < 0.0001) {
      return undefined;
    }
    return row.dailyMise > 0 ? row.dailyMise : undefined;
  }

  monthCollectedElsewhere(row: MonthRow): boolean {
    if (row.systemAmount > 0) {
      return false;
    }
    return this.allRows.some(candidate =>
      candidate !== row
      && candidate.year === row.year
      && candidate.month === row.month
      && candidate.systemAmount > 0);
  }

  private releaseEmptyMonth(row: MonthRow): void {
    if (row.systemAmount > 0) {
      return;
    }
    for (const candidate of this.allRows) {
      if (candidate === row || !candidate.selected || candidate.systemAmount > 0) {
        continue;
      }
      if (candidate.year === row.year && candidate.month === row.month) {
        candidate.selected = false;
        this.resetRowAmount(candidate);
        candidate.commercialUsername = candidate.blockCommercial;
        candidate.dailyMise = candidate.applicableMise;
      }
    }
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
    const fit = fitNotebookDays(notebookAmount, 0, row.dailyMise);
    if (!fit.exact) {
      row.useManual = true;
      row.notebookAmount = notebookAmount;
      return;
    }
    row.selectedUpTo = fit.days;
    row.maxDays = fit.maxDays;
    row.notebookAmount = fit.days * row.dailyMise;
  }

  private toRow(
      commercialUsername: string,
      year: number,
      month: number,
      systemAmount: number,
      dailyAmount?: number | null): MonthRow {
    const dailyMise = resolveMonthMise(dailyAmount, this.member?.amount);
    return {
      year,
      month,
      monthName: MONTH_NAMES[month] || `Mois ${month}`,
      commercialUsername,
      systemAmount,
      dailyMise,
      applicableMise: dailyMise,
      blockCommercial: commercialUsername,
      selected: false,
      notebookAmount: null,
      selectedUpTo: null,
      maxDays: MISE_DAY_STEP,
      useManual: dailyMise <= 0
    };
  }

  private async toast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2800, color, position: 'top' });
    await t.present();
  }
}
