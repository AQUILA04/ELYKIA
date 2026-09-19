import { ChangeDetectionStrategy, Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, take, distinctUntilChanged, debounceTime, filter, map } from 'rxjs/operators';
import { Article } from '../../../../models/article.model';
import * as DistributionActions from '../../../../store/distribution/distribution.actions';
import * as ArticleActions from '../../../../store/article/article.actions';
import {
  selectAvailableArticles,
  selectArticlesPaginationLoading,
  selectArticlesPaginationHasMore
} from '../../../../store/distribution/distribution.selectors';
import {
  selectCatalogueArticles,
  selectCatalogueLoading,
  selectCatalogueHasMore
} from '../../../../store/article/article.selectors';
import { selectAuthUser } from '../../../../store/auth/auth.selectors';

export type ArticlesSegment = 'stock' | 'catalogue';

@Component({
  selector: 'app-article-list',
  templateUrl: './article-list.page.html',
  styleUrls: ['./article-list.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleListPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchTerm$ = new BehaviorSubject<string>('');
  private segment$ = new BehaviorSubject<ArticlesSegment>('stock');

  activeSegment: ArticlesSegment = 'stock';

  articles$: Observable<Article[]>;
  isLoading$: Observable<boolean>;
  hasMore$: Observable<boolean>;

  constructor(private store: Store) {
    this.articles$ = combineLatest([
      this.segment$,
      this.store.select(selectAvailableArticles),
      this.store.select(selectCatalogueArticles)
    ]).pipe(
      map(([segment, stock, catalogue]) => segment === 'stock' ? stock : catalogue)
    );

    this.isLoading$ = combineLatest([
      this.segment$,
      this.store.select(selectArticlesPaginationLoading),
      this.store.select(selectCatalogueLoading)
    ]).pipe(
      map(([segment, stockLoading, catalogueLoading]) =>
        segment === 'stock' ? stockLoading : catalogueLoading
      )
    );

    this.hasMore$ = combineLatest([
      this.segment$,
      this.store.select(selectArticlesPaginationHasMore),
      this.store.select(selectCatalogueHasMore)
    ]).pipe(
      map(([segment, stockHasMore, catalogueHasMore]) =>
        segment === 'stock' ? stockHasMore : catalogueHasMore
      )
    );
  }

  ngOnInit() {
    this.setupSearch();
    this.loadFirstPage();
  }

  ionViewWillEnter() {
    // Optional: Refresh if needed, but ngOnInit should handle initial load
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch() {
    this.searchTerm$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.loadFirstPage(term);
    });
  }

  onSegmentChange(event: CustomEvent) {
    const value = (event.detail?.value || 'stock') as ArticlesSegment;
    if (value === this.activeSegment) {
      return;
    }
    this.activeSegment = value;
    this.segment$.next(value);
    this.loadFirstPage(this.searchTerm$.value);
  }

  loadFirstPage(query: string = this.searchTerm$.value) {
    if (this.activeSegment === 'catalogue') {
      this.store.dispatch(ArticleActions.loadFirstPageCatalogueArticles({
        pageSize: 20,
        filters: { searchQuery: query }
      }));
      return;
    }

    this.store.select(selectAuthUser).pipe(
      take(1),
      filter(user => !!user)
    ).subscribe(user => {
      this.store.dispatch(DistributionActions.loadFirstPageAvailableArticles({
        commercialUsername: user!.username,
        pageSize: 20,
        filters: {
          searchQuery: query
        }
      }));
    });
  }

  loadMoreData(event: any) {
    if (this.activeSegment === 'catalogue') {
      this.store.dispatch(ArticleActions.loadNextPageCatalogueArticles({
        filters: { searchQuery: this.searchTerm$.value }
      }));
      setTimeout(() => event.target.complete(), 500);
      return;
    }

    this.store.select(selectAuthUser).pipe(
      take(1),
      filter(user => !!user)
    ).subscribe(user => {
      this.store.dispatch(DistributionActions.loadNextPageAvailableArticles({
        commercialUsername: user!.username,
        filters: {
          searchQuery: this.searchTerm$.value
        }
      }));

      setTimeout(() => event.target.complete(), 500);
    });
  }

  onSearchInput(event: any) {
    this.searchTerm$.next(event.target.value || '');
  }

  trackByArticleId(index: number, article: Article): string {
    return article.id;
  }
}
