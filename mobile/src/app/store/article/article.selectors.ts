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
