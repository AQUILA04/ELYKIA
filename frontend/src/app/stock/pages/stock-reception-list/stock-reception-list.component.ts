import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { StockReceptionService } from '../../services/stock-reception.service';
import { StockReception } from '../../../core/models/stock-reception.model';
import { AuthService } from '../../../auth/service/auth.service';
import { UserProfilConstant } from '../../../shared/constants/user-profil.constant';

@Component({
  selector: 'app-stock-reception-list',
  templateUrl: './stock-reception-list.component.html',
  styleUrls: ['./stock-reception-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StockReceptionListComponent implements OnInit {
  receptions: StockReception[] = [];
  isLoading = false;
  totalElement = 0;
  totalPages = 1;
  pageSize = 10;
  currentPage = 0;
  searchReference = '';
  searchDate: string | null = null;
  isAdmin = false;

  currentDate: Date = new Date();
  lastUpdate: Date = new Date();

  constructor(
    private stockReceptionService: StockReceptionService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.hasRole(UserProfilConstant.ADMIN);
    this.loadReceptions();
    setInterval(() => { this.currentDate = new Date(); }, 1000);
  }

  loadReceptions(): void {
    this.isLoading = true;
    this.stockReceptionService.getReceptions(this.currentPage, this.pageSize, this.searchReference, this.searchDate).subscribe({
      next: (response) => {
        if (response?.data?.content) {
          this.receptions = response.data.content;
          this.totalElement = response.data.page.totalElements;
          this.totalPages = response.data.page.totalPages;
        } else {
          this.receptions = [];
          this.totalElement = 0;
          this.totalPages = 1;
        }
        this.lastUpdate = new Date();
        this.isLoading = false;
      },
      error: () => {
        this.receptions = [];
        this.totalElement = 0;
        this.isLoading = false;
      }
    });
  }

  onSearchChange(): void {
    this.currentPage = 0;
    this.loadReceptions();
  }

  refresh(): void {
    this.searchReference = '';
    this.searchDate = null;
    this.currentPage = 0;
    this.loadReceptions();
  }

  changePage(delta: number): void {
    this.currentPage = Math.max(0, Math.min(this.totalPages - 1, this.currentPage + delta));
    this.loadReceptions();
  }

  goPage(index: number): void {
    this.currentPage = index;
    this.loadReceptions();
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getPaginationInfo(): string {
    if (this.totalElement === 0) return '0 résultat';
    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min((this.currentPage + 1) * this.pageSize, this.totalElement);
    return `${start}–${end} sur ${this.totalElement}`;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(/[\s.]/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  viewDetails(id: number): void {
    this.router.navigate(['/stock/receptions', id]);
  }

  cancelReception(reception: StockReception): void {
    if (reception.status === 'CANCELLED') {
      import('sweetalert2').then(Swal => Swal.default.fire('Information', 'Cette réception est déjà annulée.', 'info'));
      return;
    }

    import('sweetalert2').then(Swal => {
      Swal.default.fire({
        title: 'Êtes-vous sûr ?',
        text: 'Voulez-vous vraiment annuler cette réception ? Les stocks seront mis à jour.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Oui, annuler',
        cancelButtonText: 'Non'
      }).then((result) => {
        if (result.isConfirmed) {
          this.stockReceptionService.cancelReception(reception.id).subscribe({
            next: () => {
              Swal.default.fire('Annulée !', 'La réception a été annulée.', 'success');
              this.loadReceptions();
            },
            error: (err) => {
              Swal.default.fire('Erreur', err.error?.message || 'Une erreur est survenue lors de l\'annulation.', 'error');
            }
          });
        }
      });
    });
  }
}
