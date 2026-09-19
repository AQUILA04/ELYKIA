import { createReducer, on } from '@ngrx/store';
import * as ArticleActions from './article.actions';
import { Article } from '../../models/article.model';

export interface ArticleState {
  articles: Article[];
  loading: boolean;
  error: any;
  catalogue: Article[];
  catalogueLoading: boolean;
  catalogueError: any;
  cataloguePage: number;
  catalogueSize: number;
  catalogueTotalElements: number;
  catalogueTotalPages: number;
  catalogueHasMore: boolean;
}

export const initialState: ArticleState = {
  articles: [],
  loading: false,
  error: null,
  catalogue: [],
  catalogueLoading: false,
  catalogueError: null,
  cataloguePage: 0,
  catalogueSize: 20,
  catalogueTotalElements: 0,
  catalogueTotalPages: 0,
  catalogueHasMore: false,
};

export const articleReducer = createReducer(
  initialState,
  on(ArticleActions.loadArticles, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(ArticleActions.loadArticlesSuccess, (state, { articles }) => ({
    ...state,
    articles,
    loading: false,
    error: null,
  })),
  on(ArticleActions.loadArticlesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(ArticleActions.updateArticleStock, (state, { articleId, quantity }) => ({
    ...state,
    articles: state.articles.map(article =>
      article.id === articleId ? { ...article, stockQuantity: article.stockQuantity + quantity } : article
    ),
  })),
  on(ArticleActions.loadFirstPageCatalogueArticles, (state, { pageSize }) => ({
    ...state,
    catalogueLoading: true,
    cataloguePage: 0,
    catalogueSize: pageSize || 20,
    catalogue: [],
    catalogueError: null,
  })),
  on(ArticleActions.loadNextPageCatalogueArticles, (state) => ({
    ...state,
    catalogueLoading: true,
    catalogueError: null,
  })),
  on(ArticleActions.loadCatalogueArticlesSuccess, (state, { page }) => ({
    ...state,
    catalogue: page.page === 0 ? page.content : [...state.catalogue, ...page.content],
    catalogueTotalElements: page.totalElements,
    catalogueTotalPages: page.totalPages,
    cataloguePage: page.page,
    catalogueSize: page.size,
    catalogueHasMore: (page.page + 1) < page.totalPages,
    catalogueLoading: false,
  })),
  on(ArticleActions.loadCatalogueArticlesFailure, (state, { error }) => ({
    ...state,
    catalogueLoading: false,
    catalogueError: error,
  }))
);
