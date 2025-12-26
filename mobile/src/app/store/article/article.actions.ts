import { createAction, props } from '@ngrx/store';
import { Article } from '../../models/article.model';

export const loadArticles = createAction(
  '[Article] Load Articles'
);

export const loadArticlesSuccess = createAction(
  '[Article] Load Articles Success',
  props<{ articles: Article[] }>()
);

export const loadArticlesFailure = createAction(
  '[Article] Load Articles Failure',
  props<{ error: any }>()
);

export const updateArticleStock = createAction(
  '[Article] Update Article Stock',
  props<{ articleId: string; quantity: number }>()
);
