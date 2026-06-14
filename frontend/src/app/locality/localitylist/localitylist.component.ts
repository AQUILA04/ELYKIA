import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { LocalityService, Locality } from '../service/locality.service';
import { Router } from '@angular/router';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';

interface LocalityListState {
  searchTerm: string;
  currentPage: number;
  pageSize: number;
}

@Component({
  selector: 'app-localitylist',
  templateUrl: './localitylist.component.html',
  styleUrls: ['./localitylist.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class LocalityListComponent implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'localityListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  localities: Locality[] = [];
  currentPage = 0;
  pageSize = 5;
  totalElement = 0;
  totalPages = 0;
  searchTerm = '';
  isLoading = false;

  currentDate = new Date();
  lastUpdate = new Date();

  constructor(
    private localityService: LocalityService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private alertService: AlertService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.restoreState();
    this.loadLocalities();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.saveState();
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  loadLocalities(): void {
    this.isLoading = true;
    const search = this.searchTerm.trim();

    this.localityService.getLocalities(this.currentPage, this.pageSize, 'id,desc', search).subscribe({
      next: (data) => {
        if (data.statusCode === 200) {
          this.localities = data.data.content;
          this.totalElement = data.data.page.totalElements;
          this.totalPages = data.data.page.totalPages ?? 1;
          this.lastUpdate = new Date();
        } else {
          this.alertService.showError(data.message || 'Une erreur est survenue');
        }
        this.isLoading = false;
        this.saveState();
      },
      error: (err) => {
        this.isLoading = false;
        this.alertService.showError('Erreur de communication avec le serveur');
        console.error(err);
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.saveState();
    this.loadLocalities();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.saveState();
    this.loadLocalities();
  }

  refresh(): void {
    this.loadLocalities();
  }

  deleteLocality(id: number): void {
    this.alertService.showDeleteConfirmation('Êtes-vous sûr de vouloir supprimer cette localité?')
      .then((result) => {
        if (result) {
          this.localityService.deleteLocality(id).subscribe({
            next: () => {
              this.alertService.showDefaultSucces('La localité a été supprimée avec succès!');
              this.loadLocalities();
            },
            error: (error) => {
              const errorMessage = error?.error?.message || 'Erreur lors de la suppression.';
              this.alertService.showError(errorMessage);
              console.error('Erreur lors de la suppression de la localité', error);
            }
          });
        }
      });
  }

  addLocality(): void {
    this.saveState();
    this.router.navigate(['/locality-add']);
  }

  viewDetails(localityId: number): void {
    this.saveState();
    this.router.navigate(['/localitydetails', localityId]);
  }

  editLocality(localityId: number): void {
    this.saveState();
    this.router.navigate(['/locality-add', localityId]);
  }

  private saveState(): void {
    const state: LocalityListState = {
      searchTerm: this.searchTerm,
      currentPage: this.currentPage,
      pageSize: this.pageSize
    };
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    const saved = sessionStorage.getItem(this.STATE_KEY);
    if (!saved) return;
    try {
      const state = JSON.parse(saved) as LocalityListState;
      this.searchTerm = state.searchTerm ?? '';
      this.currentPage = state.currentPage ?? 0;
      this.pageSize = state.pageSize ?? 5;
    } catch (e) {
      console.error('Erreur restauration état liste localités', e);
    }
  }
}
