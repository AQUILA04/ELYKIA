import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { map, distinctUntilChanged, startWith, takeUntil, debounceTime } from 'rxjs/operators';
import { Article } from '../../../../models/article.model';
import { selectAllArticles } from '../../../../store/article/article.selectors';
import * as ArticleActions from '../../../../store/article/article.actions';

// L'événement peut être typé 'any' pour plus de simplicité, car il est géré par le module.
// import { InfiniteScrollCustomEvent } from '@ionic/angular';

@Component({
  selector: 'app-article-list',
  templateUrl: './article-list.page.html',
  styleUrls: ['./article-list.page.scss'],
  standalone: false, // CORRECTION : On revient à un composant non-autonome
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleListPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  private allArticles: Article[] = [];
  public displayedArticles: Article[] = [];
  private page = 0;
  private readonly pageSize = 20;
  public isInfiniteScrollDisabled = false;

  public articleCount$!: Observable<number>;
  private searchTerm$ = new BehaviorSubject<string>('');

  constructor(
    private store: Store,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.setupDataStreams();
  }

  ionViewWillEnter() {
    // Dispatch l'action pour recharger les articles à chaque fois que la vue est active
    this.store.dispatch(ArticleActions.loadArticles());
  }

  private setupDataStreams() {
    const availableArticles$ = this.store.select(selectAllArticles).pipe(
      map(articles => articles.filter(a => a.stockQuantity > 0))
    );

    const searchTermAction$ = this.searchTerm$.asObservable().pipe(
      debounceTime(300),
      map(term => (term || '').toLowerCase()),
      distinctUntilChanged()
    );

    combineLatest([availableArticles$, searchTermAction$]).pipe(
      map(([articles, searchTerm]) => {
        if (!searchTerm) {
          return articles;
        }
        return articles.filter(article =>
          (article.name && article.name.toLowerCase().includes(searchTerm)) ||
          (article.commercialName && article.commercialName.toLowerCase().includes(searchTerm)) ||
          (article.reference && article.reference.toLowerCase().includes(searchTerm))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(filteredArticles => {
      this.allArticles = filteredArticles;
      this.resetAndLoadFirstPage();
    });

    this.articleCount$ = availableArticles$.pipe(map(articles => articles.length));
  }

  private resetAndLoadFirstPage() {
    this.page = 0;
    this.displayedArticles = [];
    this.isInfiniteScrollDisabled = false;
    this.loadMoreData();
  }

  loadMoreData(event?: any) { // Le type 'any' est utilisé pour éviter les problèmes d'import
    const startIndex = this.page * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    const nextChunk = this.allArticles.slice(startIndex, endIndex);
    this.displayedArticles.push(...nextChunk);

    this.page++;

    if (this.displayedArticles.length >= this.allArticles.length) {
      this.isInfiniteScrollDisabled = true;
    }

    if (event) {
      event.target.complete();
    }

    this.cdr.markForCheck();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(event: any) {
    this.searchTerm$.next(event.target.value);
  }

  trackByArticleId(index: number, article: Article): string {
    return article.id;
  }
}

