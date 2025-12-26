import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, merge } from 'rxjs';
import { startWith, switchMap, catchError, map, takeUntil } from 'rxjs/operators';
import { TontineDeliveryService } from '../../services/tontine-delivery.service';
import { AuthService } from 'src/app/auth/service/auth.service';
import {
  TontineDelivery,
  PaginatedResponse,
  TONTINE_DELIVERY_STATUS_LABELS,
  TONTINE_DELIVERY_STATUS_COLORS,
  formatCurrency,
  formatDateTime,
  TontineMemberDeliveryStatus,
  ApiResponse
} from '../../types/tontine.types';

@Component({
  selector: 'app-tontine-magasinier-dashboard',
  templateUrl: './tontine-magasinier-dashboard.component.html',
  styleUrls: ['./tontine-magasinier-dashboard.component.scss']
})
export class TontineMagasinierDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['clientName', 'deliveryDate', 'totalAmount', 'commercialUsername', 'status', 'actions'];
  dataSource = new MatTableDataSource<TontineDelivery>([]);
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  resultsLength = 0;
  isLoadingResults = true;
  isRateLimitReached = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private deliveryService: TontineDeliveryService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    if (!this.authService.hasPermission('ROLE_MAGASINIER')) {
      this.showError('Accès refusé. Vous n\'avez pas les autorisations nécessaires pour accéder à cette page.');
      // Potentially redirect to a different page
    }
  }

  ngAfterViewInit(): void {
    // If the user changes the sort order, reset back to the first page.
    this.sort.sortChange.pipe(takeUntil(this.destroy$)).subscribe(() => (this.paginator.pageIndex = 0));

    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return this.deliveryService.getValidatedDeliveries(
            this.paginator.pageIndex,
            this.paginator.pageSize
          ).pipe(catchError(() => {
            this.isRateLimitReached = true;
            return [];
          }));
        }),
        map((apiResponse: ApiResponse<PaginatedResponse<TontineDelivery>>) => {
          this.isLoadingResults = false;
          this.isRateLimitReached = apiResponse === null;

          if (apiResponse === null || !apiResponse.data) {
            return [];
          }

          this.resultsLength = apiResponse.data.page.totalElements;
          return [...apiResponse.data.content]; // Convert readonly to mutable array
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(data => (this.dataSource.data = data));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatCurrency(amount: number): string {
    return formatCurrency(amount);
  }

  formatDateTime(date: string): string {
    return formatDateTime(date);
  }

  getStatusLabel(status: TontineMemberDeliveryStatus): string {
    return TONTINE_DELIVERY_STATUS_LABELS[status] || status;
  }

  getStatusColor(status: TontineMemberDeliveryStatus): string {
    return TONTINE_DELIVERY_STATUS_COLORS[status] || 'secondary';
  }

  onMarkAsDelivered(deliveryId: number): void {
    if (confirm('Êtes-vous sûr de vouloir marquer cette livraison comme livrée ?')) {
      this.isLoadingResults = true;
      this.deliveryService.markDeliveryAsDelivered(deliveryId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.showSuccess('Livraison marquée comme livrée avec succès.');
          this.refreshTable();
        },
        error: (err) => {
          this.showError(err.message || 'Erreur lors du marquage de la livraison.');
          this.isLoadingResults = false;
        }
      });
    }
  }

  refreshTable(): void {
    this.paginator.page.emit();
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
