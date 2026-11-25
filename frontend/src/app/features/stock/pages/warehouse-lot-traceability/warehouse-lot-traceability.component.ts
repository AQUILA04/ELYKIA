import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WarehouseStockService, LotLifecycleTrace } from '../../services/warehouse-stock.service';
import { AlertService } from '@shared/service/alert.service';

@Component({
  selector: 'app-warehouse-lot-traceability',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './warehouse-lot-traceability.component.html',
  styleUrls: ['./warehouse-lot-traceability.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class WarehouseLotTraceabilityComponent implements OnInit, OnDestroy {
  private dateIntervalId?: ReturnType<typeof setInterval>;

  currentDate = new Date();
  lastUpdate = new Date();
  isLoading = true;
  searchTerm = '';
  traces: LotLifecycleTrace[] = [];
  selectedTrace: LotLifecycleTrace | null = null;

  constructor(
    private warehouseStockService: WarehouseStockService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadTraces();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  loadTraces(): void {
    this.isLoading = true;
    this.warehouseStockService.listLotTraces().subscribe({
      next: (rows) => {
        this.traces = rows ?? [];
        this.lastUpdate = new Date();
        this.isLoading = false;
      },
      error: () => {
        this.alertService.showError('Erreur lors du chargement de la traçabilité des lots.');
        this.isLoading = false;
      },
    });
  }

  get filteredTraces(): LotLifecycleTrace[] {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) {
      return this.traces;
    }
    return this.traces.filter(
      (t) =>
        (t.lotCode && t.lotCode.toLowerCase().includes(q)) ||
        (t.articleName && t.articleName.toLowerCase().includes(q)) ||
        (t.receptionReference && t.receptionReference.toLowerCase().includes(q))
    );
  }

  get totalInitialUnits(): number {
    return this.filteredTraces.reduce((sum, t) => sum + (t.initialQuantity || 0), 0);
  }

  get totalWarehouseUnits(): number {
    return this.filteredTraces.reduce((sum, t) => sum + (t.totalInWarehouses || 0), 0);
  }

  get totalCommercialUnits(): number {
    return this.filteredTraces.reduce((sum, t) => sum + (t.totalWithCommercials || 0), 0);
  }

  get totalLiquidatedUnits(): number {
    return this.filteredTraces.reduce((sum, t) => sum + (t.totalLiquidatedToClients || 0), 0);
  }

  selectTrace(trace: LotLifecycleTrace): void {
    this.selectedTrace = this.selectedTrace?.lotId === trace.lotId ? null : trace;
  }
}
