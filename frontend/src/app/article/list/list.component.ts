import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ItemService, Article, ArticleStockKpis } from '../service/item.service';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AuthService } from '../../auth/service/auth.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';

interface ArticleListState {
  searchTerm: string;
  currentPage: number;
  pageSize: number;
  sortField: string;
}

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ListComponent implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'articleListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  articles: Article[] = [];
  currentPage = 0;
  pageSize = 10;
  totalElement = 0;
  isLoading = true;
  sortField = 'id,desc';
  searchTerm = '';
  selectedArticles = new Set<number>();
  isAllSelected = false;
  isGestionnaire = false;
  showCreditKpis = false;

  currentDate = new Date();
  lastUpdate = new Date();
  stockKpis: ArticleStockKpis | null = null;

  constructor(
    private itemService: ItemService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private alertService: AlertService,
    private authService: AuthService,
    private userService: UserService
  ) {
    this.tokenStorage.checkConnectedUser();
    this.showCreditKpis = this.userService.hasProfile(UserProfile.GESTIONNAIRE);
    try {
      const user = this.authService.getCurrentUser();
      if (user?.roles && Array.isArray(user.roles)) {
        this.isGestionnaire = user.roles.includes('ROLE_VALIDATE_CREDIT');
      }
    } catch (e) {
      console.error('Impossible de lire les informations utilisateur', e);
    }
  }

  ngOnInit(): void {
    this.restoreState();
    this.loadStockKpis();
    this.loadArticles();
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

  loadStockKpis(): void {
    this.itemService.getArticleStockKpis().subscribe({
      next: (kpis) => {
        this.stockKpis = kpis;
      },
      error: (err) => {
        console.error('Erreur chargement KPI stock', err);
      }
    });
  }

  loadArticles(): void {
    this.isLoading = true;
    this.itemService.getArticles(this.currentPage, this.pageSize, this.sortField, this.searchTerm).subscribe({
      next: (data) => {
        if (data.statusCode === 200) {
          this.articles = data.data.content;
          this.totalElement = data.data.page?.totalElements ?? data.data.totalElements ?? 0;
          this.lastUpdate = new Date();
        } else {
          this.alertService.showError(data.message || 'Une erreur est survenue lors du chargement');
        }
        this.isLoading = false;
        this.saveState();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des articles', error);
        this.alertService.showError('Erreur de communication avec le serveur.');
        this.isLoading = false;
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.saveState();
    this.loadArticles();
  }

  onSearch(): void {
    this.currentPage = 0;
    this.saveState();
    this.loadArticles();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 0;
    this.saveState();
    this.loadArticles();
  }

  refresh(): void {
    this.loadStockKpis();
    this.loadArticles();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(amount ?? 0);
  }

  getStatusLabel(status?: string): string {
    if (status === 'ENABLED') return 'Actif';
    if (status === 'DISABLED') return 'Désactivé';
    if (status === 'DELETED') return 'Supprimé';
    return 'N/A';
  }

  getStatusBadgeClass(status?: string): string {
    if (status === 'ENABLED') return 'status-delivered';
    if (status === 'DISABLED') return 'status-pending';
    if (status === 'DELETED') return 'status-deleted';
    return 'status-inprogress';
  }

  deleteArticle(id: number): void {
    this.alertService.showDeleteConfirmation('Voulez-vous vraiment supprimer cet article ?')
      .then((result) => {
        if (result) {
          this.itemService.deleteArticle(id).subscribe({
            next: () => {
              this.alertService.showDefaultSucces('L\'article a été supprimé avec succès.');
              this.loadStockKpis();
              this.loadArticles();
            },
            error: (error) => {
              const errorMessage = error?.error?.message || 'Erreur lors de la suppression de l\'article.';
              this.alertService.showError(errorMessage);
            }
          });
        }
      });
  }

  toggleState(article: Article): void {
    const status = article.status || article.state;
    const action = status === 'ENABLED' ? 'désactiver' : 'activer';
    this.alertService.showConfirmation('Confirmation', `Voulez-vous vraiment ${action} cet article ?`)
      .then((result) => {
        if (result) {
          const request = status === 'ENABLED'
            ? this.itemService.disableArticle(article.id)
            : this.itemService.enableArticle(article.id);

          request.subscribe({
            next: () => {
              this.alertService.showDefaultSucces(`Article ${action === 'activer' ? 'activé' : 'désactivé'} avec succès.`);
              this.loadArticles();
            },
            error: (err) => {
              this.alertService.showError(err?.error?.message || 'Erreur lors de l\'action.');
            }
          });
        }
      });
  }

  toggleSelection(article: Article): void {
    if (this.selectedArticles.has(article.id)) {
      this.selectedArticles.delete(article.id);
    } else {
      this.selectedArticles.add(article.id);
    }
    this.checkIfAllSelected();
  }

  toggleAllSelection(): void {
    if (this.isAllSelected) {
      this.selectedArticles.clear();
      this.isAllSelected = false;
    } else {
      this.articles.forEach(a => this.selectedArticles.add(a.id));
      this.isAllSelected = true;
    }
  }

  checkIfAllSelected(): void {
    this.isAllSelected = this.articles.length > 0 && this.articles.every(a => this.selectedArticles.has(a.id));
  }

  disableSelected(): void {
    if (this.selectedArticles.size === 0) return;
    this.alertService.showConfirmation('Confirmation', `Voulez-vous désactiver ${this.selectedArticles.size} articles ?`)
      .then((result) => {
        if (result) {
          this.itemService.disableArticles(Array.from(this.selectedArticles)).subscribe({
            next: () => {
              this.alertService.showDefaultSucces('Articles désactivés avec succès.');
              this.selectedArticles.clear();
              this.isAllSelected = false;
              this.loadArticles();
            },
            error: (err) => {
              this.alertService.showError(err?.error?.message || 'Erreur lors de la désactivation.');
            }
          });
        }
      });
  }

  enableSelected(): void {
    if (this.selectedArticles.size === 0) return;
    this.alertService.showConfirmation('Confirmation', `Voulez-vous activer ${this.selectedArticles.size} articles ?`)
      .then((result) => {
        if (result) {
          this.itemService.enableArticles(Array.from(this.selectedArticles)).subscribe({
            next: () => {
              this.alertService.showDefaultSucces('Articles activés avec succès.');
              this.selectedArticles.clear();
              this.isAllSelected = false;
              this.loadArticles();
            },
            error: (err) => {
              this.alertService.showError(err?.error?.message || 'Erreur lors de l\'activation.');
            }
          });
        }
      });
  }

  addArticle(): void {
    this.saveState();
    this.router.navigate(['/add']);
  }

  viewDetails(articleId: number): void {
    this.saveState();
    this.router.navigate(['/details', articleId]);
  }

  editArticle(articleId: number): void {
    this.saveState();
    this.router.navigate(['/add', articleId]);
  }

  private saveState(): void {
    const state: ArticleListState = {
      searchTerm: this.searchTerm,
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      sortField: this.sortField
    };
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    const saved = sessionStorage.getItem(this.STATE_KEY);
    if (!saved) return;
    try {
      const state = JSON.parse(saved) as ArticleListState;
      this.searchTerm = state.searchTerm ?? '';
      this.currentPage = state.currentPage ?? 0;
      this.pageSize = state.pageSize ?? 10;
      this.sortField = state.sortField ?? 'id,desc';
    } catch (e) {
      console.error('Erreur restauration état liste articles', e);
    }
  }
}
