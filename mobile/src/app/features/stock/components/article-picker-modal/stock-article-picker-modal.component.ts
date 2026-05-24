import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ArticleService } from '../../../../core/services/article.service';
import { Article } from '../../../../models/article.model';

@Component({
  selector: 'app-stock-article-picker-modal',
  templateUrl: './stock-article-picker-modal.component.html',
  styleUrls: ['./stock-article-picker-modal.component.scss'],
  standalone: false
})
export class StockArticlePickerModalComponent implements OnInit {
  searchQuery = '';
  articles: Article[] = [];
  loading = false;

  private currentPage = 0;
  private readonly pageSize = 30;
  hasMore = true;

  constructor(
    private modalCtrl: ModalController,
    private articleService: ArticleService
  ) {}

  ngOnInit(): void {
    this.loadArticles();
  }

  close(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  onSearch(event: Event): void {
    const customEvent = event as CustomEvent<{ value?: string }>;
    this.searchQuery = customEvent.detail?.value?.trim() ?? '';
    this.resetAndSearch();
  }

  loadMore(event: Event): void {
    const target = (event as CustomEvent).target as HTMLIonInfiniteScrollElement;
    if (!this.hasMore) {
      target.complete();
      return;
    }
    this.fetchPage(this.searchQuery, this.currentPage, () => target.complete());
  }

  selectArticle(article: Article): void {
    this.modalCtrl.dismiss(article, 'selected');
  }

  trackById(_index: number, article: Article): string {
    return article.id;
  }

  displayName(article: Article): string {
    return article.commercialName || article.name;
  }

  private resetAndSearch(): void {
    this.currentPage = 0;
    this.articles = [];
    this.hasMore = true;
    this.loadArticles();
  }

  private loadArticles(): void {
    this.loading = this.currentPage === 0;
    this.fetchPage(this.searchQuery, this.currentPage, () => {
      this.loading = false;
    });
  }

  private fetchPage(query: string, page: number, done: () => void): void {
    this.articleService.searchArticlesPaginated(query, page, this.pageSize).subscribe({
      next: (result) => {
        this.articles = page === 0 ? result.content : [...this.articles, ...result.content];
        this.hasMore = result.content.length === this.pageSize;
        this.currentPage = page + 1;
        done();
      },
      error: () => {
        this.loading = false;
        done();
      }
    });
  }
}
