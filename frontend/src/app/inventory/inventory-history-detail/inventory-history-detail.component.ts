import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryItemDto, InventoryService } from '../service/inventory.service';

@Component({
  selector: 'app-inventory-history-detail',
  templateUrl: './inventory-history-detail.component.html',
  styleUrls: ['./inventory-history-detail.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false,
})
export class InventoryHistoryDetailComponent implements OnInit, OnDestroy {
  inventoryId!: number;
  inventoryDate = '';
  status = '';
  createdByUser = '';
  completedAt = '';
  items: InventoryItemDto[] = [];
  filteredItems: InventoryItemDto[] = [];
  searchTerm = '';
  isLoading = false;
  currentDate = new Date();
  lastUpdate = new Date();
  private dateIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.inventoryId = +this.route.snapshot.params['id'];
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
    this.inventoryService.getInventoryById(this.inventoryId).subscribe({
      next: (inv: any) => {
        this.inventoryDate = inv.inventoryDate;
        this.status = inv.status;
        this.createdByUser = inv.createdByUser;
        this.completedAt = inv.completedAt;
        this.items = inv.items ?? [];
        this.applyFilter();
        this.lastUpdate = new Date();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  applyFilter(): void {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) {
      this.filteredItems = [...this.items];
      return;
    }
    this.filteredItems = this.items.filter(
      (i) =>
        (i.articleName || '').toLowerCase().includes(q) ||
        (i.articleMarque || '').toLowerCase().includes(q) ||
        (i.articleModel || '').toLowerCase().includes(q)
    );
  }

  get discrepancyCount(): number {
    return this.items.filter((i) => i.difference != null && i.difference !== 0).length;
  }

  get validatedCount(): number {
    return this.items.filter((i) => i.status === 'VALIDATED').length;
  }

  openTrajectory(itemId: number): void {
    this.router.navigate(['/inventory/trajectory', itemId]);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      DRAFT: 'Brouillon',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Clôturé',
      RECONCILED: 'Réconcilié',
      PENDING: 'En attente',
      VALIDATED: 'Validé',
      DEBT: 'Dette',
      SURPLUS: 'Surplus',
    };
    return labels[status] ?? status;
  }
}
