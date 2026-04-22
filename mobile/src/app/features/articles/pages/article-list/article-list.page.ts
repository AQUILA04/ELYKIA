import { ChangeDetectionStrategy, Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { takeUntil, take, distinctUntilChanged, debounceTime, filter } from 'rxjs/operators';
import { Article } from '../../../../models/article.model';
import * as DistributionActions from '../../../../store/distribution/distribution.actions';
import {
  selectAvailableArticles,
  selectArticlesPaginationLoading,
  selectArticlesPaginationHasMore
} from '../../../../store/distribution/distribution.selectors';
import { selectAuthUser } from '../../../../store/auth/auth.selectors';

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

  articles$: Observable<Article[]>;
  isLoading$: Observable<boolean>;
  hasMore$: Observable<boolean>;

  constructor(private store: Store) {
    this.articles$ = this.store.select(selectAvailableArticles);
    this.isLoading$ = this.store.select(selectArticlesPaginationLoading);
    this.hasMore$ = this.store.select(selectArticlesPaginationHasMore);
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

  loadFirstPage(query: string = this.searchTerm$.value) {
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

      // Complete infinite scroll event when data loads or if valid
      // Ideally should listen to loading state, but for simplicity:
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
