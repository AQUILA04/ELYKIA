import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { MobileMoneyConfigService } from '../mobile-money-config.service';
import {
  CommercialMobileMoneyConfigPage,
  CommercialMobileMoneyConfigRow,
} from '../mobile-money-config.model';

interface EditableRow extends CommercialMobileMoneyConfigRow {
  draftMixxNumber: string;
  draftMoovNumber: string;
  saving: boolean;
}

@Component({
  selector: 'app-mobile-money-config-list',
  templateUrl: './mobile-money-config-list.component.html',
  styleUrls: ['./mobile-money-config-list.component.scss'],
})
export class MobileMoneyConfigListComponent implements OnInit, OnDestroy {
  page: CommercialMobileMoneyConfigPage | null = null;
  rows: EditableRow[] = [];
  isLoading = false;
  currentDate = new Date();
  lastUpdate = new Date();
  private dateIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private service: MobileMoneyConfigService,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.load();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  load(): void {
    this.isLoading = true;
    this.spinner.show();
    this.service.listAll().subscribe({
      next: (page) => {
        this.page = page;
        this.rows = (page.commercials ?? []).map((row) => this.toEditableRow(row));
        this.lastUpdate = new Date();
        this.isLoading = false;
        this.spinner.hide();
      },
      error: () => {
        this.isLoading = false;
        this.spinner.hide();
        this.toastr.error('Erreur lors du chargement de la configuration Mobile Money', 'Erreur');
      },
    });
  }

  refresh(): void {
    this.load();
  }

  saveRow(row: EditableRow): void {
    row.saving = true;
    this.service.upsert(row.commercialUsername, {
      mixxNumber: row.draftMixxNumber.trim() || null,
      moovNumber: row.draftMoovNumber.trim() || null,
    }).subscribe({
      next: (updated) => {
        Object.assign(row, this.toEditableRow(updated));
        row.saving = false;
        this.toastr.success(`Configuration enregistrée pour ${row.commercialUsername}`, 'Succès');
      },
      error: () => {
        row.saving = false;
        this.toastr.error(`Erreur lors de l'enregistrement pour ${row.commercialUsername}`, 'Erreur');
      },
    });
  }

  hasCustomConfig(row: EditableRow): boolean {
    return !!(row.draftMixxNumber.trim() || row.draftMoovNumber.trim());
  }

  get customConfigCount(): number {
    return this.rows.filter((row) => this.hasCustomConfig(row)).length;
  }

  private toEditableRow(row: CommercialMobileMoneyConfigRow): EditableRow {
    return {
      ...row,
      draftMixxNumber: row.mixxNumber ?? '',
      draftMoovNumber: row.moovNumber ?? '',
      saving: false,
    };
  }
}
