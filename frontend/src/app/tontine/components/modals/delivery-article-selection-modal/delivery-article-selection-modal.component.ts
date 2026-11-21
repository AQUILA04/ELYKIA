import { Component, Inject, OnDestroy, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map, startWith, takeUntil, finalize } from 'rxjs/operators';
import { forkJoin, of, Subject, Subscription } from 'rxjs';
import { TontineStockService } from 'src/app/stock-tontine/services/tontine-stock.service';
import { TontineStock } from 'src/app/stock-tontine/models/tontine-stock.model';
import { TontineArticleReservation, TontineDeliveryService } from '../../../services/tontine-delivery.service';
import { Article as CatalogArticle, ItemService } from 'src/app/article/service/item.service';
import {
  TontineMember,
  DeliveryItemDto,
  CreateDeliveryDto,
  formatCurrency
} from '../../../types/tontine.types';

interface SaleOffer {
  mode: 'UNIT' | 'WHOLESALE' | 'HALF_WHOLESALE' | 'CUSTOM';
  label: string;
  unitsPerPack: number;
  salePrice: number;
}

/** Ligne du stock tontine du commercial, avec la réservation indicative des commandes en cours. */
export interface StockArticleRow {
  articleId: number;
  articleName: string;
  unitPrice: number;
  available: number;
  reserved: number;
  free: number;
}

interface SelectedArticle {
  article: CatalogArticle;
  quantity: number;
  totalPrice: number;
  offers: SaleOffer[];
  offerKey: string;
}

/**
 * Lignes du stock tontine : disponible, réservé par les commandes en cours, libre (jamais négatif).
 * La réponse du stock peut être une liste ou une page.
 */
export function buildStockArticleRows(stockResponse: unknown, reservations: TontineArticleReservation[]): StockArticleRow[] {
  const raw: any = stockResponse;
  const items: TontineStock[] = Array.isArray(raw) ? raw : (raw?.data?.content ?? raw?.content ?? raw?.data ?? []);
  const reservedByArticle = new Map<number, number>();
  for (const reservation of reservations || []) {
    reservedByArticle.set(Number(reservation.articleId), Number(reservation.reservedQuantity) || 0);
  }
  return (Array.isArray(items) ? items : [])
    .filter(item => (item.availableQuantity ?? 0) > 0)
    .map(item => {
      const available = item.availableQuantity ?? 0;
      const reserved = reservedByArticle.get(Number(item.articleId)) ?? 0;
      return {
        articleId: item.articleId,
        articleName: item.articleName,
        unitPrice: item.unitPrice,
        available,
        reserved,
        free: Math.max(0, available - reserved)
      };
    })
    .sort((a, b) => (a.articleName || '').localeCompare(b.articleName || '', 'fr'));
}

@Component({
  selector: 'app-delivery-article-selection-modal',
  templateUrl: './delivery-article-selection-modal.component.html',
  styleUrls: ['./delivery-article-selection-modal.component.scss']
})
export class DeliveryArticleSelectionModalComponent implements OnInit, OnDestroy {
  @ViewChild(MatAutocompleteTrigger) autocompleteTrigger?: MatAutocompleteTrigger;

  member: TontineMember;
  searchControl = new FormControl('');
  filteredArticles: CatalogArticle[] = [];
  selectedArticles: SelectedArticle[] = [];
  loading = false;
  error: string | null = null;

  private readonly pageSize = 20;
  private readonly destroy$ = new Subject<void>();
  private articlesPage = 0;
  private articlesTotalPages = 0;
  private articlesSearchTerm = '';
  private loadArticlesSub?: Subscription;
  private autocompletePanel?: HTMLElement;
  private readonly onPanelScroll = (event: Event): void => {
    const target = event.target as HTMLElement;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 40) {
      this.loadMoreArticles();
    }
  };

  constructor(
    public dialogRef: MatDialogRef<DeliveryArticleSelectionModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { member: TontineMember; replaceDeliveryId?: number },
    private cdr: ChangeDetectorRef,
    private tontineDeliveryService: TontineDeliveryService,
    private itemService: ItemService,
    private tontineStockService: TontineStockService
  ) {
    this.member = data.member;
  }

  ngOnInit(): void {
    this.setupSearch();
  }

  /**
   * Filtre rapide : catalogue général ou stock tontine du commercial du membre.
   * Une commande prise dans le stock ne le touche pas : seule la remise le débite.
   */
  articleSource: 'CATALOGUE' | 'STOCK' = 'CATALOGUE';
  stockRows: StockArticleRow[] = [];
  stockLoading = false;
  stockError: string | null = null;
  private stockLoaded = false;

  get stockCommercial(): string | null {
    return this.member.client?.tontineCollector || null;
  }

  setArticleSource(source: 'CATALOGUE' | 'STOCK'): void {
    this.articleSource = source;
    if (source === 'STOCK' && !this.stockLoaded) {
      this.loadStockRows();
    }
  }

  addFromStock(row: StockArticleRow): void {
    this.onArticleSelected({
      id: row.articleId,
      name: row.articleName,
      commercialName: '',
      sellingPrice: row.unitPrice
    } as unknown as CatalogArticle);
  }

  private loadStockRows(): void {
    const commercial = this.stockCommercial;
    if (!commercial) {
      this.stockError = 'Ce membre n\'a pas de commercial tontine : utilisez le catalogue général.';
      return;
    }
    this.stockLoading = true;
    this.stockError = null;
    forkJoin({
      stock: this.tontineStockService.getStockByCommercial(commercial),
      reservations: this.tontineDeliveryService.getStockReservations(commercial)
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ stock, reservations }) => {
        this.stockRows = buildStockArticleRows(stock, reservations?.data ?? []);
        this.stockLoaded = true;
        this.stockLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.stockLoading = false;
        this.stockError = 'Le stock tontine du commercial n\'a pas pu être chargé.';
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.detachPanelScrollListener();
    this.loadArticlesSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(searchTerm => {
        this.articlesSearchTerm = typeof searchTerm === 'string' ? searchTerm : '';
        this.articlesPage = 0;
        return this.fetchArticlesPage(false);
      }),
      takeUntil(this.destroy$)
    ).subscribe(articles => {
      this.filteredArticles = articles;
      this.cdr.markForCheck();
    });
  }

  private fetchArticlesPage(append: boolean) {
    this.loadArticlesSub?.unsubscribe();
    this.loading = true;

    return this.itemService.getEnabledArticlesPage(
      this.articlesPage,
      this.pageSize,
      'name,asc',
      this.articlesSearchTerm
    ).pipe(
      map(response => {
        const data = response.data;
        const content = data?.content ?? [];
        const totalElements = data?.page?.totalElements ?? data?.totalElements ?? 0;
        this.articlesTotalPages = data?.page?.totalPages
          ?? data?.totalPages
          ?? (totalElements > 0 ? Math.ceil(totalElements / this.pageSize) : 0);
        return append ? [...this.filteredArticles, ...content] : content;
      }),
      finalize(() => {
        this.loading = false;
      }),
      catchError(err => {
        console.error('Error searching articles:', err);
        this.error = 'Erreur lors du chargement des articles';
        return of(append ? this.filteredArticles : []);
      })
    );
  }

  private loadMoreArticles(): void {
    if (this.loading || this.articlesPage >= this.articlesTotalPages - 1) {
      return;
    }

    this.articlesPage++;
    this.loadArticlesSub = this.fetchArticlesPage(true).subscribe(articles => {
      this.filteredArticles = articles;
      this.cdr.markForCheck();
    });
  }

  onAutocompleteOpened(): void {
    setTimeout(() => {
      this.autocompletePanel = this.autocompleteTrigger?.autocomplete?.panel?.nativeElement;
      this.autocompletePanel?.addEventListener('scroll', this.onPanelScroll, { passive: true });
    });
  }

  onAutocompleteClosed(): void {
    this.detachPanelScrollListener();
  }

  private detachPanelScrollListener(): void {
    this.autocompletePanel?.removeEventListener('scroll', this.onPanelScroll);
    this.autocompletePanel = undefined;
  }

  getArticleCode(article: CatalogArticle): string {
    return article.code?.trim() || String(article.id);
  }

  /** Libellé : commercialName + name (espaces doubles), avec repli si un champ manque. */
  formatArticleLabel(article: CatalogArticle): string {
    const commercial = article.commercialName?.trim() || '';
    const name = article.name?.trim() || '';
    if (commercial && name) {
      return `${commercial}  ${name}`;
    }
    return commercial || name || `Article #${article.id}`;
  }

  onArticleSelected(article: CatalogArticle): void {
    const commercial = this.member.client?.tontineCollector;
    this.itemService.getSaleOffers(article.id, 'TONTINE', commercial).subscribe({
      next: (response: any) => {
        const offers: SaleOffer[] = response?.data?.length
          ? response.data
          : [{ mode: 'UNIT', label: 'Unité', unitsPerPack: 1, salePrice: article.sellingPrice }];
        const offerKey = `${offers[0].mode}:${offers[0].unitsPerPack}`;
        const existing = this.selectedArticles.find(sa => sa.article.id === article.id && sa.offerKey === offerKey);
        if (existing) {
          existing.quantity++;
          this.reprice(existing);
        } else {
          const selected: SelectedArticle = { article, quantity: 1, totalPrice: 0, offers, offerKey };
          this.reprice(selected);
          this.selectedArticles.push(selected);
        }
        this.searchControl.setValue('');
      },
      error: () => {
        this.error = 'Impossible de charger les offres de cet article.';
      }
    });
  }

  onOfferChange(selected: SelectedArticle, offerKey: string): void {
    selected.offerKey = offerKey;
    selected.quantity = 1;
    this.reprice(selected);
  }

  private reprice(selected: SelectedArticle): void {
    const offer = this.offerOf(selected);
    selected.totalPrice = (offer?.salePrice || selected.article.sellingPrice || 0) * selected.quantity;
  }

  offerOf(selected: SelectedArticle): SaleOffer | undefined {
    return selected.offers.find(offer => `${offer.mode}:${offer.unitsPerPack}` === selected.offerKey) || selected.offers[0];
  }

  offerKey(offer: SaleOffer): string {
    return `${offer.mode}:${offer.unitsPerPack}`;
  }

  displayArticle(article: CatalogArticle | null): string {
    return article ? '' : '';
  }

  updateQuantity(selectedArticle: SelectedArticle, change: number): void {
    selectedArticle.quantity += change;
    if (selectedArticle.quantity < 1) {
      selectedArticle.quantity = 1;
    }
    this.reprice(selectedArticle);
  }

  removeArticle(selectedArticle: SelectedArticle): void {
    const index = this.selectedArticles.indexOf(selectedArticle);
    if (index > -1) {
      this.selectedArticles.splice(index, 1);
    }
  }

  get totalAmount(): number {
    return this.selectedArticles.reduce((sum, sa) => sum + sa.totalPrice, 0);
  }

  get availableBalance(): number {
    return this.member.availableContribution ?? 0;
  }

  get orderCeiling(): number {
    return Math.max(this.member.projectedBalance ?? 0, this.availableBalance);
  }

  get remainingBalance(): number {
    return this.orderCeiling - this.totalAmount;
  }

  get isValid(): boolean {
    if (this.selectedArticles.length === 0 || this.remainingBalance < -0.001) {
      return false;
    }
    if (this.data.replaceDeliveryId != null) {
      return this.totalAmount <= this.availableBalance + 0.001;
    }
    return true;
  }

  formatCurrency(amount: number): string {
    return formatCurrency(amount);
  }

  /** Date de livraison prévue (facultative), saisie à la création de la commande. */
  plannedDeliveryDate = '';
  readonly today = new Date().toISOString().split('T')[0];

  onCancel(): void {
    this.dialogRef.close();
  }

  onValidate(): void {
    if (!this.isValid) return;

    const items: DeliveryItemDto[] = this.selectedArticles.map(sa => {
      const offer = this.offerOf(sa);
      const units = offer && offer.mode !== 'UNIT' ? offer.unitsPerPack : 1;
      return {
        articleId: sa.article.id,
        quantity: sa.quantity * units,
        unitPrice: offer?.salePrice || sa.article.sellingPrice,
        salePackMode: offer?.mode || 'UNIT',
        packCount: sa.quantity,
        unitsPerPack: units
      };
    });

    const createDeliveryDto: CreateDeliveryDto = {
      tontineMemberId: this.member.id,
      items,
      ...(this.plannedDeliveryDate ? { plannedDeliveryDate: this.plannedDeliveryDate } : {})
    };

    this.loading = true;
    const request = this.data.replaceDeliveryId != null
      ? this.tontineDeliveryService.updateItems(this.data.replaceDeliveryId, items)
      : this.tontineDeliveryService.createDelivery(createDeliveryDto);
    request.subscribe({
      next: (response) => {
        this.loading = false;
        this.dialogRef.close(response?.data ?? true);
      },
      error: (error) => {
        console.error('Error creating delivery', error);
        this.loading = false;
        this.error = error.message || 'Erreur lors de la création de la livraison.';
      }
    });
  }
}
