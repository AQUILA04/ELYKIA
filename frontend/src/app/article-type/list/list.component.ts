import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { ArticleTypeService, ArticleType } from '../service/article-type.service';
import { AlertService } from 'src/app/shared/service/alert.service';

interface ArticleTypeListState {
  search: string;
  page: number;
  size: number;
}

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class ListComponent implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'articleTypeListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  types: ArticleType[] = [];
  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;
  search = '';
  isLoading = false;

  currentDate = new Date();
  lastUpdate = new Date();

  constructor(
    private articleTypeService: ArticleTypeService,
    private alertService: AlertService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.restoreState();
    this.getList();
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

  getList(): void {
    this.isLoading = true;
    this.articleTypeService.getTypes(this.page, this.size, this.search).subscribe({
      next: (res) => {
        if (res.statusCode === 200) {
          this.types = res.data.content;
          this.totalElements = res.data.page.totalElements;
          this.totalPages = res.data.page.totalPages ?? 1;
          this.lastUpdate = new Date();
        }
        this.isLoading = false;
        this.saveState();
      },
      error: (error) => {
        console.error('Error fetching types', error);
        this.alertService.showError('Erreur lors du chargement des types');
        this.isLoading = false;
      }
    });
  }

  refresh(): void {
    this.getList();
  }

  onSearch(): void {
    this.page = 0;
    this.saveState();
    this.getList();
  }

  clearSearch(): void {
    this.search = '';
    this.onSearch();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.saveState();
    this.getList();
  }

  navigateToAdd(): void {
    this.saveState();
    this.router.navigate(['/article-type/add']);
  }

  editType(id: number): void {
    this.saveState();
    this.router.navigate(['/article-type/edit', id]);
  }

  onDelete(id: number): void {
    this.alertService.showDeleteConfirmation('Êtes-vous sûr de vouloir supprimer ce type ?')
      .then((result) => {
        if (result) {
          this.articleTypeService.deleteType(id).subscribe({
            next: () => {
              this.alertService.showSuccess('Type supprimé avec succès');
              this.getList();
            },
            error: (error) => {
              console.error('Error deleting type', error);
              this.alertService.showError('Erreur lors de la suppression');
            }
          });
        }
      });
  }

  private saveState(): void {
    const state: ArticleTypeListState = {
      search: this.search,
      page: this.page,
      size: this.size
    };
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    const saved = sessionStorage.getItem(this.STATE_KEY);
    if (!saved) return;
    try {
      const state = JSON.parse(saved) as ArticleTypeListState;
      this.search = state.search ?? '';
      this.page = state.page ?? 0;
      this.size = state.size ?? 10;
    } catch (e) {
      console.error('Erreur restauration état liste types article', e);
    }
  }
}
