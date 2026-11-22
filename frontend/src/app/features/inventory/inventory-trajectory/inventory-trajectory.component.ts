import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ArticleStockTrajectoryDto, InventoryService } from '../service/inventory.service';

@Component({
  selector: 'app-inventory-trajectory',
  templateUrl: './inventory-trajectory.component.html',
  styleUrls: ['./inventory-trajectory.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false,
})
export class InventoryTrajectoryComponent implements OnInit, OnDestroy {
  itemId!: number;
  toDate = '';
  trajectory: ArticleStockTrajectoryDto | null = null;
  isLoading = false;
  errorMessage = '';
  currentDate = new Date();
  lastUpdate = new Date();
  private dateIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.itemId = +this.route.snapshot.params['itemId'];
    const today = new Date();
    this.toDate = today.toISOString().slice(0, 10);
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
    this.errorMessage = '';
    this.inventoryService.getItemTrajectory(this.itemId, this.toDate || undefined).subscribe({
      next: (data) => {
        this.trajectory = data;
        this.lastUpdate = new Date();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Impossible de charger la trajectoire.';
        this.trajectory = null;
      },
    });
  }

  operationLabel(type?: string): string {
    const labels: Record<string, string> = {
      ENTREE: 'Entrée',
      SORTIE: 'Sortie',
      RETURN: 'Retour',
      RESET: 'Reset',
      INVENTORY_ADJUSTMENT: 'Ajustement inventaire',
      CANCEL_RECEPTION: 'Annulation réception',
    };
    return type ? labels[type] ?? type : '';
  }

  kindLabel(kind: string): string {
    return kind === 'INVENTORY_CHECKPOINT' ? 'Jalon inventaire' : 'Mouvement';
  }
}
