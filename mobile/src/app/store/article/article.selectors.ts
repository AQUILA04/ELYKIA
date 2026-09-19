import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ArticleState } from './article.reducer';

export const selectArticleState = createFeatureSelector<ArticleState>('article');

export const selectAllArticles = createSelector(
  selectArticleState,
  (state) => state.articles
);

export const selectArticlesLoading = createSelector(
  selectArticleState,
  (state) => state.loading
);

export const selectArticlesError = createSelector(
  selectArticleState,
  (state) => state.error
);

export const selectCatalogueArticles = createSelector(
  selectArticleState,
  (state) => state.catalogue
);

export const selectCatalogueLoading = createSelector(
  selectArticleState,
  (state) => state.catalogueLoading
);

export const selectCatalogueHasMore = createSelector(
  selectArticleState,
  (state) => state.catalogueHasMore
);

export const selectCataloguePage = createSelector(
  selectArticleState,
  (state) => state.cataloguePage
);

export const selectCatalogueSize = createSelector(
  selectArticleState,
  (state) => state.catalogueSize
);

export const selectCatalogueTotalElements = createSelector(
  selectArticleState,
  (state) => state.catalogueTotalElements
);
