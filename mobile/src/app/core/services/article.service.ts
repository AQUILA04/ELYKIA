import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Network } from '@capacitor/network';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DatabaseService } from './database.service';
import { Article } from '../../models/article.model';
import { ApiResponse } from '../../models/api-response.model';
import { HealthCheckService } from './health-check.service';
import { ArticleRepository } from '../repositories/article.repository';
import { Page } from '../repositories/repository.interface';

@Injectable({
  providedIn: 'root'
})
export class ArticleService {

  constructor(
    private http: HttpClient,
    private dbService: DatabaseService,
    private healthCheckService: HealthCheckService,
    private articleRepository: ArticleRepository
  ) { }

  initializeArticles(): Observable<Article[]> {
    return this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        if (isOnline) {
          return this.fetchArticlesFromApi().pipe(
            tap(async (articles) => {
              // Set stockQuantity to 0 for all articles before saving
              const articlesWithZeroStock = articles.map(article => ({
                ...article,
                stockQuantity: 0
              }));
              await this.articleRepository.saveAll(articlesWithZeroStock);
            }),
            catchError((error) => {
              console.error('Failed to fetch articles from API, attempting local:', error);
              return of([]);
            })
          );
        } else {
          return of([]);
        }
      })
    );
  }

  private fetchArticlesFromApi(): Observable<Article[]> {
    const url = `${environment.apiUrl}/api/v1/articles?page=0&size=1000`;
    return this.http.get<ApiResponse<any>>(url).pipe(
      map(response => response.data.content)
    );
  }

  getArticles(): Observable<Article[]> {
    // Warning: This loads all articles.
    // Articles are usually reference data and might be needed in full for dropdowns.
    // However, if the list is huge, this is bad.
    // For now, we keep it but warn.
    // Ideally, dropdowns should use search/pagination.
    return from(this.articleRepository.findAll());
  }

  searchArticlesPaginated(query: string, page: number, size: number): Observable<Page<Article>> {
    return from(this.articleRepository.searchArticles(query, page, size));
  }
}
