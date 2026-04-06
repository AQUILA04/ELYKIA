import { Component, OnInit } from '@angular/core';
import { ItemService, Article } from '../service/item.service';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AuthService } from "../../auth/service/auth.service";

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  articles: Article[] = [];
  currentPage = 0;
  pageSize = 5;
  totalElement = 0;
  isLoading = true;
  sortField = 'id,desc';
  searchTerm: string = '';
  selectedArticles: Set<number> = new Set();
  isAllSelected: boolean = false;

  // NOUVEAU : Variable pour identifier le rôle
  isGestionnaire: boolean = false;

  constructor(
    private itemService: ItemService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private tokenStorage: TokenStorageService,
    private alertService: AlertService,
    private authService: AuthService
  ) {
    this.tokenStorage.checkConnectedUser();

    // NOUVEAU : Logique pour déterminer le rôle
    try {
      const user = this.authService.getCurrentUser();
      // On vérifie si la liste de permissions de l'utilisateur contient
      // une permission distinctive du GESTIONNAIRE.
      if (user && user.roles && Array.isArray(user.roles)) {
        this.isGestionnaire = user.roles.includes('ROLE_VALIDATE_CREDIT');
      }
    } catch (e) {
      console.error('Impossible de lire les informations utilisateur', e);
    }
  }

  ngOnInit(): void {
    this.loadArticles();
  }

  loadArticles(): void {
    if (!this.searchTerm) {
      this.spinner.show();
    }

    this.itemService.getArticles(this.currentPage, this.pageSize, this.sortField, this.searchTerm).subscribe({
      next: (data) => {
        if (data.statusCode === 200) {
          this.articles = data.data.content;
          this.totalElement = data.data.page.totalElements;
          this.isLoading = false;
        } else {
          this.alertService.showError(data.message || 'Une erreur est survenue lors du chargement');
        }
        if (!this.searchTerm) {
          this.spinner.hide();
        }

      },
      error: (error) => {
        console.error('Erreur lors du chargement des articles', error);
        this.alertService.showError('Erreur de communication avec le serveur.');
        if (!this.searchTerm) {
          this.spinner.hide();
        }
        this.isLoading = false;
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadArticles();
  }

  onSearch(): void {
    this.currentPage = 0;
    this.pageSize = 5;
    this.loadArticles();
  }

  refresh(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  deleteArticle(id: number): void {
    this.alertService.showDeleteConfirmation('Voulez-vous vraiment supprimer cet article ?')
      .then((result) => {
        if (result) {
          this.itemService.deleteArticle(id).subscribe({
            next: () => {
              this.alertService.showDefaultSucces('L\'article a été supprimé avec succès.');
              this.loadArticles();
            },
            error: (error) => {
              const errorMessage = error?.error?.message || 'Erreur lors de la suppression de l\'article.';
              this.alertService.showError(errorMessage);
              console.error('Erreur lors de la suppression de l\'article', error);
            }
          });
        }
      });
  }

  toggleState(article: Article): void {
    const action = article.status === 'ENABLED' ? 'désactiver' : 'activer';
    this.alertService.showConfirmation('Confirmation', `Voulez-vous vraiment ${action} cet article ?`)
      .then((result) => {
        if (result) {
          const request = article.status === 'ENABLED'
            ? this.itemService.disableArticle(article.id)
            : this.itemService.enableArticle(article.id);

          request.subscribe({
            next: () => {
              this.alertService.showDefaultSucces(`Article ${action === 'activer' ? 'activé' : 'désactivé'} avec succès.`);
              this.loadArticles();
            },
            error: (err) => {
              const errorMessage = err?.error?.message || `Erreur lors de l'action.`;
              this.alertService.showError(errorMessage);
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
              const errorMessage = err?.error?.message || 'Erreur lors de la désactivation.';
              this.alertService.showError(errorMessage);
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
              const errorMessage = err?.error?.message || 'Erreur lors de l\'activation.';
              this.alertService.showError(errorMessage);
            }
          });
        }
      });
  }

  addArticle(): void {
    this.router.navigate(['/add']);
  }

  viewDetails(articleId: number): void {
    this.router.navigate(['/details', articleId]);
  }

  editArticle(articleId: number): void {
    this.router.navigate(['/add', articleId]);
  }
}
