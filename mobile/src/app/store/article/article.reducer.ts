import { createReducer, on } from '@ngrx/store';
import * as ArticleActions from './article.actions';
import { Article } from '../../models/article.model';

export interface ArticleState {
  articles: Article[];
  loading: boolean;
  error: any;
}

export const initialState: ArticleState = {
  articles: [],
  loading: false,
  error: null,
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
      article.id === articleId ? { ...article, stock: article.stockQuantity + quantity } : article
    ),
  }))
);
