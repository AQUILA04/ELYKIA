import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { concat, from, of } from 'rxjs';
import { catchError, concatMap, filter, map, switchMap, withLatestFrom } from 'rxjs/operators';
import * as ArticleActions from './article.actions';
import { ArticleService } from '../../core/services/article.service';
import { OnlineListRefreshService } from '../../core/services/online-list-refresh.service';
import {
  selectCataloguePage,
  selectCatalogueSize
} from './article.selectors';
import { Page } from '../../core/repositories/repository.interface';
import { Article } from '../../models/article.model';

@Injectable()
export class ArticleEffects {
  constructor(
    private actions$: Actions,
    private articleService: ArticleService,
    private onlineListRefreshService: OnlineListRefreshService,
    private store: Store
  ) {}

  loadArticles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArticleActions.loadArticles),
      switchMap(() =>
        this.articleService.getArticles().pipe(
          map((articles) => ArticleActions.loadArticlesSuccess({ articles })),
          catchError((error) => of(ArticleActions.loadArticlesFailure({ error: error.message })))
        )
      )
    )
  );

  loadFirstPageCatalogue$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArticleActions.loadFirstPageCatalogueArticles),
      switchMap((action) => {
        const pageSize = action.pageSize || 20;
        return this.articleService.searchCataloguePaginated(0, pageSize, action.filters?.searchQuery).pipe(
          concatMap((localPage) => concat(
            of(ArticleActions.loadCatalogueArticlesSuccess({ page: localPage })),
            from(this.onlineListRefreshService.refreshArticlesCataloguePage(0, pageSize, action.filters)).pipe(
              filter((serverPage): serverPage is Page<Article> => !!serverPage),
              map((serverPage) => ArticleActions.loadCatalogueArticlesSuccess({ page: serverPage }))
            )
          )),
          catchError((error) => of(ArticleActions.loadCatalogueArticlesFailure({
            error: error?.message || error
          })))
        );
      })
    )
  );

  loadNextPageCatalogue$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArticleActions.loadNextPageCatalogueArticles),
      withLatestFrom(
        this.store.select(selectCataloguePage),
        this.store.select(selectCatalogueSize)
      ),
      switchMap(([action, currentPage, pageSize]) => {
        const nextPage = currentPage + 1;
        return this.articleService.searchCataloguePaginated(nextPage, pageSize, action.filters?.searchQuery).pipe(
          map((page) => {
            void this.onlineListRefreshService.refreshArticlesCataloguePage(
              nextPage,
              pageSize,
              action.filters
            );
            return ArticleActions.loadCatalogueArticlesSuccess({ page });
          }),
          catchError((error) => of(ArticleActions.loadCatalogueArticlesFailure({
            error: error?.message || error
          })))
        );
      })
    )
  );
}
