import { createAction, props } from '@ngrx/store';
import { Article } from '../../models/article.model';
import { Page } from '../../core/repositories/repository.interface';
import { ArticleCatalogueFilters } from '../../core/repositories/article.repository';

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

export const loadFirstPageCatalogueArticles = createAction(
  '[Article] Load First Page Catalogue',
  props<{ pageSize?: number; filters?: ArticleCatalogueFilters }>()
);

export const loadNextPageCatalogueArticles = createAction(
  '[Article] Load Next Page Catalogue',
  props<{ filters?: ArticleCatalogueFilters }>()
);

export const loadCatalogueArticlesSuccess = createAction(
  '[Article] Load Catalogue Success',
  props<{ page: Page<Article> }>()
);

export const loadCatalogueArticlesFailure = createAction(
  '[Article] Load Catalogue Failure',
  props<{ error: any }>()
);
