import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ItemService,
  Article,
  ArticleHistoryItem,
  ArticleStateHistoryItem
} from '../service/item.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { AuthService } from '../../auth/service/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { QuickStockEntryComponent } from './components/quick-stock-entry/quick-stock-entry.component';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
  standalone: false
})
export class DetailComponent implements OnInit {
  article: Article | undefined;
  isLoading = true;
  articleHistory: ArticleHistoryItem[] = [];
  articleStateHistory: ArticleStateHistoryItem[] = [];

  // Permissions
  isGestionnaire: boolean = false;
  canViewCreditPrice: boolean = false;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    public itemService: ItemService,
    private tokenStorage: TokenStorageService,
    private spinner: NgxSpinnerService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.checkUserRoles();
    this.route.params.subscribe(params => {
      const articleId = +params['id'];
      this.loadArticle(articleId);
      this.loadArticleHistory(articleId);
      this.loadArticleStateHistory(articleId);
    });
  }

  private checkUserRoles(): void {
    try {
      const user = this.authService.getCurrentUser();
      if (user && user.roles && Array.isArray(user.roles)) {
        const roles = user.roles;
        this.isGestionnaire = roles.includes('ROLE_VALIDATE_CREDIT');
        this.canViewCreditPrice =
          roles.includes('ROLE_VALIDATE_CREDIT') ||
          roles.includes('ROLE_CONSULT_CLIENT') ||
          roles.includes('ROLE_PROMOTER');
      }
    } catch (e) {
      console.error('Impossible de lire les informations utilisateur', e);
      this.isGestionnaire = false;
      this.canViewCreditPrice = false;
    }
  }

  loadArticle(articleId: number): void {
    this.spinner.show();
    this.itemService.getArticleById(articleId).subscribe({
      next: (data) => {
        this.spinner.hide();
        this.article = data?.data;
        this.isLoading = false;
      },
      error: (error) => {
        this.spinner.hide();
        console.error("Erreur lors de la récupération des détails de l'article", error);
        this.isLoading = false;
      }
    });
  }

  loadArticleHistory(articleId: number): void {
    this.itemService.getArticleHistory(articleId).subscribe({
      next: (data) => {
        this.articleHistory = data?.data ?? [];
      },
      error: (err) => {
        console.error('Erreur chargement historique article', err);
      }
    });
  }

  loadArticleStateHistory(articleId: number): void {
    this.itemService.getArticleStateHistory(articleId).subscribe({
      next: (data) => {
        this.articleStateHistory = data?.data ?? [];
      },
      error: (err) => {
        console.error('Erreur chargement historique états article', err);
      }
    });
  }

  // ---- Computed helpers ----

  get stockPercent(): number {
    if (!this.article) return 0;
    const optimal = this.article.optimalStockLevel || 0;
    const qty = this.article.stockQuantity || 0;
    if (optimal <= 0) return qty > 0 ? 100 : 0;
    return Math.min(100, Math.round((qty / optimal) * 100));
  }

  /** Retourne la couleur CSS selon le niveau de stock */
  get stockRingClass(): string {
    const reorder = this.article?.reorderPoint || 0;
    const qty = this.article?.stockQuantity || 0;
    if (qty === 0) return 'ring-out';
    if (reorder > 0 && qty <= reorder) return 'ring-low';
    return 'ring-ok';
  }

  get stockStatusClass(): string {
    const cls = this.stockRingClass;
    if (cls === 'ring-out') return 'st-out';
    if (cls === 'ring-low') return 'st-low';
    return 'st-ok';
  }

  get stockStatusLabel(): string {
    const cls = this.stockRingClass;
    if (cls === 'ring-out') return '✕ Rupture de stock';
    if (cls === 'ring-low') return '⚠ Stock faible';
    return '✓ Stock OK';
  }

  /** Calcul stroke-dashoffset SVG (cercle r=50, circumference≈314) */
  get stockDashOffset(): number {
    const circumference = 2 * Math.PI * 50; // ~314.16
    return circumference - (this.stockPercent / 100) * circumference;
  }

  get marginCash(): number {
    if (!this.article) return 0;
    return (this.article.sellingPrice || 0) - (this.article.purchasePrice || 0);
  }

  get marginCredit(): number {
    if (!this.article) return 0;
    return (this.article.creditSalePrice || 0) - (this.article.purchasePrice || 0);
  }

  get marginCashPct(): string {
    if (!this.article || !this.article.purchasePrice) return '0%';
    return ((this.marginCash / this.article.purchasePrice) * 100).toFixed(1) + '%';
  }

  get marginCreditPct(): string {
    if (!this.article || !this.article.purchasePrice) return '0%';
    return ((this.marginCredit / this.article.purchasePrice) * 100).toFixed(1) + '%';
  }

  get stockValue(): number {
    if (!this.article) return 0;
    return (this.article.stockQuantity || 0) * (this.article.purchasePrice || 0);
  }

  get potentialRevenue(): number {
    if (!this.article) return 0;
    return (this.article.stockQuantity || 0) * (this.article.creditSalePrice || 0);
  }

  get reorderAlert(): boolean {
    if (!this.article) return false;
    const qty = this.article.stockQuantity || 0;
    const reorder = this.article.reorderPoint || 0;
    return reorder > 0 && qty <= reorder;
  }

  get daysCoverage(): number {
    if (!this.article || !this.article.averageMonthlySales || this.article.averageMonthlySales === 0) return 0;
    const dailySales = this.article.averageMonthlySales / 30;
    return Math.floor((this.article.stockQuantity || 0) / dailySales);
  }

  get coveragePct(): number {
    const days = this.daysCoverage;
    const optimal = 60; // 60 jours = 100%
    return Math.min(100, Math.round((days / optimal) * 100));
  }

  getHistoryBadgeClass(op: string): string {
    if (op === 'ENTREE') return 'op-entree';
    if (op === 'SORTIE') return 'op-sortie';
    return 'op-reset';
  }

  getHistoryQtyClass(op: string): string {
    if (op === 'ENTREE') return 'qty-plus';
    if (op === 'SORTIE') return 'qty-minus';
    return 'qty-reset';
  }

  getHistoryQtyPrefix(op: string): string {
    if (op === 'ENTREE') return '+';
    if (op === 'SORTIE') return '−';
    return '';
  }

  getStateDotClass(newState: string): string {
    return newState === 'ENABLED' ? 'dot-green' : 'dot-red';
  }

  getStateLabel(state: string): string {
    if (state === 'ENABLED') return 'ACTIF';
    if (state === 'DISABLED') return 'INACTIF';
    return state;
  }

  getStateColor(state: string): string {
    return state === 'ENABLED' ? 'var(--green)' : 'var(--red)';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  openStockEntryDialog(): void {
    if (!this.article) return;
    const dialogRef = this.dialog.open(QuickStockEntryComponent, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'qse-dialog',
      data: { article: this.article }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success && this.article) {
        // Mise à jour optimiste du stock local
        this.article = {
          ...this.article,
          stockQuantity: (this.article.stockQuantity ?? 0) + result.quantity
        };
        // Rechargement de l'historique des mouvements
        this.loadArticleHistory(this.article.id);
      }
    });
  }

  toggleArticleState(): void {
    if (!this.article) return;
    const action$ = this.article.status === 'ENABLED'
      ? this.itemService.disableArticle(this.article.id)
      : this.itemService.enableArticle(this.article.id);
    action$.subscribe({
      next: () => {
        if (this.article) {
          this.article.status = this.article.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
        }
      },
      error: (err) => console.error('Erreur lors du changement d\'état de l\'article', err)
    });
  }

  onCancel(): void {
    this.router.navigate(['/list']);
  }

  navigateToEdit(articleId: number | undefined): void {
    if (articleId) {
      this.router.navigate(['/add', articleId]);
    }
  }
}
