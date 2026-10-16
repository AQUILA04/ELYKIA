import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { WithdrawalFeeBracket, WithdrawalFeeService } from './withdrawal-fee.service';

@Component({
  selector: 'app-withdrawal-fee-grid',
  templateUrl: './withdrawal-fee-grid.component.html',
  styleUrls: [
    '../mobile-money-config-list/mobile-money-config-list.component.scss',
    './withdrawal-fee-grid.component.scss',
  ],
})
export class WithdrawalFeeGridComponent implements OnInit {
  rows: WithdrawalFeeBracket[] = [];
  isLoading = false;
  saving = false;
  currentDate = new Date();
  draft = this.emptyDraft('MIXX');
  editingId: number | null = null;

  constructor(
    private service: WithdrawalFeeService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  rowsFor(network: string): WithdrawalFeeBracket[] {
    return this.rows.filter((row) => row.network === network);
  }

  load(): void {
    this.isLoading = true;
    this.service.list().subscribe({
      next: (rows) => {
        this.rows = rows;
        this.isLoading = false;
        this.currentDate = new Date();
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Impossible de charger les grilles de frais.');
      },
    });
  }

  edit(row: WithdrawalFeeBracket): void {
    this.editingId = row.id ?? null;
    this.draft = {
      network: row.network,
      minAmount: row.minAmount,
      maxAmount: row.maxAmount,
      feeAmount: row.feeAmount,
    };
  }

  cancelEdit(): void {
    this.editingId = null;
    this.draft = this.emptyDraft(this.draft.network);
  }

  save(): void {
    this.saving = true;
    const request = this.editingId
      ? this.service.update(this.editingId, this.draft)
      : this.service.create(this.draft);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(this.editingId ? 'Tranche modifiée.' : 'Tranche enregistrée.');
        this.cancelEdit();
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.toastr.error(err?.error?.message || 'La tranche n’a pas pu être enregistrée.');
      },
    });
  }

  remove(row: WithdrawalFeeBracket): void {
    if (!row.id) {
      return;
    }
    this.service.remove(row.id).subscribe({
      next: () => {
        this.toastr.success('Tranche retirée.');
        this.load();
      },
      error: () => this.toastr.error('La tranche n’a pas pu être retirée.'),
    });
  }

  private emptyDraft(network: string): WithdrawalFeeBracket {
    return { network, minAmount: 0, maxAmount: 0, feeAmount: 0 };
  }
}
