import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  WarehouseStockService,
  WarehouseStockTransfer,
  WarehouseTransferStatus,
} from '../../services/warehouse-stock.service';
import { AlertService } from '@shared/service/alert.service';

@Component({
  selector: 'app-warehouse-transfer-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './warehouse-transfer-list.component.html',
  styleUrls: ['./warehouse-transfer-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class WarehouseTransferListComponent implements OnInit, OnDestroy {
  private dateIntervalId?: ReturnType<typeof setInterval>;

  currentDate = new Date();
  lastUpdate = new Date();
  isLoading = true;
  statusFilter: WarehouseTransferStatus | '' = '';
  transfers: WarehouseStockTransfer[] = [];
  totalElements = 0;

  showCreateForm = false;
  sourceAgencyId = 1;
  targetAgencyId = 2;
  transferNote = '';
  articleIdInput = 1;
  quantityInput = 1;

  constructor(
    private warehouseStockService: WarehouseStockService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadTransfers();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  loadTransfers(): void {
    this.isLoading = true;
    this.warehouseStockService.searchTransfers(null, this.statusFilter, 0, 50).subscribe({
      next: (res) => {
        this.transfers = res.content ?? [];
        this.totalElements = res.totalElements ?? this.transfers.length;
        this.lastUpdate = new Date();
        this.isLoading = false;
      },
      error: () => {
        this.alertService.showError('Erreur lors du chargement des transferts inter-agences.');
        this.isLoading = false;
      },
    });
  }

  get countCreated(): number {
    return this.transfers.filter((t) => t.status === 'CREATED').length;
  }

  get countValidated(): number {
    return this.transfers.filter((t) => t.status === 'VALIDATED').length;
  }

  get countShipped(): number {
    return this.transfers.filter((t) => t.status === 'SHIPPED').length;
  }

  get countReceived(): number {
    return this.transfers.filter((t) => t.status === 'RECEIVED').length;
  }

  createTransfer(): void {
    if (this.sourceAgencyId === this.targetAgencyId) {
      this.alertService.showError("L'agence source et l'agence cible doivent être différentes.");
      return;
    }
    this.warehouseStockService
      .createTransfer({
        sourceAgencyId: Number(this.sourceAgencyId),
        targetAgencyId: Number(this.targetAgencyId),
        note: this.transferNote,
        items: [{ articleId: Number(this.articleIdInput), quantity: Number(this.quantityInput) }],
      })
      .subscribe({
        next: () => {
          this.alertService.showDefaultSucces('Transfert inter-agences créé avec succès.');
          this.showCreateForm = false;
          this.loadTransfers();
        },
        error: (err) => {
          this.alertService.showError(err?.error?.message || 'Erreur lors de la création du transfert.');
        },
      });
  }

  validateTransfer(t: WarehouseStockTransfer): void {
    this.warehouseStockService.validateTransfer(t.id).subscribe({
      next: () => {
        this.alertService.showDefaultSucces(`Transfert ${t.reference} validé (stock source réservé).`);
        this.loadTransfers();
      },
      error: (err) => this.alertService.showError(err?.error?.message || 'Erreur de validation.'),
    });
  }

  shipTransfer(t: WarehouseStockTransfer): void {
    this.warehouseStockService.shipTransfer(t.id).subscribe({
      next: () => {
        this.alertService.showDefaultSucces(`Transfert ${t.reference} expédié (sortie FIFO agence source).`);
        this.loadTransfers();
      },
      error: (err) => this.alertService.showError(err?.error?.message || "Erreur d'expédition."),
    });
  }

  receiveTransfer(t: WarehouseStockTransfer): void {
    this.warehouseStockService.receiveTransfer(t.id).subscribe({
      next: () => {
        this.alertService.showDefaultSucces(`Transfert ${t.reference} réceptionné par l'agence cible.`);
        this.loadTransfers();
      },
      error: (err) => this.alertService.showError(err?.error?.message || 'Erreur de réception.'),
    });
  }

  cancelTransfer(t: WarehouseStockTransfer): void {
    this.warehouseStockService.cancelTransfer(t.id).subscribe({
      next: () => {
        this.alertService.showDefaultSucces(`Transfert ${t.reference} annulé.`);
        this.loadTransfers();
      },
      error: (err) => this.alertService.showError(err?.error?.message || "Erreur d'annulation."),
    });
  }
}
