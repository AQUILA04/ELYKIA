import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { InventoryService, InventorySummaryDto } from '../service/inventory.service';

@Component({
  selector: 'app-inventory-history',
  templateUrl: './inventory-history.component.html',
  styleUrls: ['./inventory-history.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false,
})
export class InventoryHistoryComponent implements OnInit, OnDestroy {
  inventories: InventorySummaryDto[] = [];
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  isLoading = false;
  statusFilter = '';
  fromDate = '';
  toDate = '';
  currentDate = new Date();
  lastUpdate = new Date();
  private dateIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadInventories();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  loadInventories(): void {
    this.isLoading = true;
    this.inventoryService
      .getAllInventories(
        this.currentPage,
        this.pageSize,
        this.statusFilter || undefined,
        this.fromDate || undefined,
        this.toDate || undefined
      )
      .subscribe({
        next: (response: any) => {
          const data = response?.data ?? response;
          this.inventories = data?.content ?? [];
          this.totalElements = data?.page?.totalElements ?? data?.totalElements ?? 0;
          this.lastUpdate = new Date();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.inventories = [];
        },
      });
  }

  onFilter(): void {
    this.currentPage = 0;
    this.loadInventories();
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.fromDate = '';
    this.toDate = '';
    this.onFilter();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadInventories();
  }

  openDetail(id: number): void {
    this.router.navigate(['/inventory/history', id]);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      DRAFT: 'Brouillon',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Clôturé',
      RECONCILED: 'Réconcilié',
    };
    return labels[status] ?? status;
  }
}
