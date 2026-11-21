import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { TontineStockRepository } from '../../../core/repositories/tontine-stock.repository';
import { ArticleRepository } from '../../../core/repositories/article.repository';
import { TontineStock } from '../../../models/tontine.model';
import { Article } from '../../../models/article.model';
import { IfUnitPriceDirective } from '../../directives/if-unit-price.directive';

/** Commande : stock tontine ou catalogue. Livraison : stock tontine du commercial uniquement. */
export type TontineArticlePickerMode = 'order' | 'deliver';
export type TontineArticlePickerSource = 'stock' | 'catalogue';

/** Article choisi : ajouté à la commande à 1 unité (prix unitaire, le serveur recalcule à l'enregistrement). */
export interface TontineArticlePick {
  articleId: string;
  articleName: string;
  unitPrice: number;
  /** Stock tontine disponible chez le commercial (null : article du catalogue hors stock). */
  stockAvailable: number | null;
}

interface PickerRow extends TontineArticlePick {
  /** Quantité déjà dans la commande en cours d'édition. */
  inOrder: number;
}

const PAGE_SIZE = 40;

@Component({
  selector: 'app-tontine-article-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, IfUnitPriceDirective],
  templateUrl: './tontine-article-picker-modal.component.html',
  styleUrls: ['./tontine-article-picker-modal.component.scss']
})
export class TontineArticlePickerModalComponent implements OnInit {
  @Input() mode: TontineArticlePickerMode = 'order';
  @Input() commercialUsername = '';
  @Input() sessionId: string | null = null;
  /** Quantités déjà commandées par article (pour afficher « déjà 2 dans la commande » et borner le stock). */
  @Input() quantitiesInOrder: Record<string, number> = {};
  /** Montant encore disponible sous le plafond (null : non borné, ex. livraison). */
  @Input() remainingUnderCeiling: number | null = null;

  source: TontineArticlePickerSource = 'stock';
  query = '';
  loading = false;
  rows: PickerRow[] = [];
  private stocks: TontineStock[] = [];

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly stockRepo: TontineStockRepository,
    private readonly articleRepo: ArticleRepository
  ) {}

  get canUseCatalogue(): boolean {
    return this.mode === 'order';
  }

  get title(): string {
    return this.mode === 'deliver' ? 'Ajouter depuis mon stock' : 'Ajouter un article';
  }

  async ngOnInit(): Promise<void> {
    await this.loadStocks();
    await this.refresh();
  }

  async setSource(source: TontineArticlePickerSource | string | undefined): Promise<void> {
    if (!this.canUseCatalogue || (source !== 'stock' && source !== 'catalogue')) {
      return;
    }
    this.source = source;
    await this.refresh();
  }

  async onSearch(value: string | null | undefined): Promise<void> {
    this.query = (value ?? '').trim();
    await this.refresh();
  }

  /** En livraison, un article ne s'ajoute que si le stock du commercial couvre une unité de plus. */
  isBlocked(row: PickerRow): boolean {
    if (this.mode !== 'deliver') {
      return false;
    }
    return (row.stockAvailable ?? 0) <= row.inOrder;
  }

  exceedsCeiling(row: PickerRow): boolean {
    return this.remainingUnderCeiling !== null && row.unitPrice > this.remainingUnderCeiling + 0.001;
  }

  pick(row: PickerRow): void {
    if (this.isBlocked(row)) {
      return;
    }
    const { inOrder, ...pick } = row;
    void this.modalCtrl.dismiss(pick, 'pick');
  }

  close(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  trackRow(_: number, row: PickerRow): string {
    return row.articleId;
  }

  private async loadStocks(): Promise<void> {
    if (!this.sessionId || !this.commercialUsername) {
      this.stocks = [];
      return;
    }
    try {
      this.stocks = await this.stockRepo.getByCommercialAndSession(this.commercialUsername, this.sessionId);
    } catch (error) {
      console.error('Stock tontine indisponible', error);
      this.stocks = [];
    }
  }

  private async refresh(): Promise<void> {
    this.loading = true;
    try {
      this.rows = this.source === 'catalogue' && this.canUseCatalogue
        ? await this.catalogueRows()
        : this.stockRows();
    } finally {
      this.loading = false;
    }
  }

  private stockRows(): PickerRow[] {
    const needle = this.query.toLowerCase();
    return this.stocks
      .filter(stock => this.mode !== 'deliver' || (stock.availableQuantity ?? 0) > 0)
      .filter(stock => !needle || (stock.articleName || '').toLowerCase().includes(needle))
      .map(stock => ({
        articleId: String(stock.articleId),
        articleName: stock.articleName || 'Article',
        unitPrice: Number(stock.unitPrice) || 0,
        stockAvailable: stock.availableQuantity ?? 0,
        inOrder: this.quantitiesInOrder[String(stock.articleId)] ?? 0
      }));
  }

  private async catalogueRows(): Promise<PickerRow[]> {
    let articles: Article[] = [];
    try {
      const page = await this.articleRepo.searchCatalogueArticles(0, PAGE_SIZE, { searchQuery: this.query });
      articles = page.content;
    } catch (error) {
      console.error('Catalogue indisponible', error);
    }
    const stockByArticle = new Map(this.stocks.map(stock => [String(stock.articleId), stock]));
    return articles.map(article => {
      const id = String(article.id);
      const stock = stockByArticle.get(id);
      return {
        articleId: id,
        articleName: article.commercialName || article.name || 'Article',
        unitPrice: Number(article.sellingPrice ?? article.creditSalePrice ?? 0) || 0,
        stockAvailable: stock ? stock.availableQuantity ?? 0 : null,
        inOrder: this.quantitiesInOrder[id] ?? 0
      };
    });
  }
}
