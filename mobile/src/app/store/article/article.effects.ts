import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import * as ArticleActions from './article.actions';
import { ArticleService } from '../../core/services/article.service';

@Injectable()
export class ArticleEffects {
  constructor(
    private actions$: Actions,
    private articleService: ArticleService
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
}
