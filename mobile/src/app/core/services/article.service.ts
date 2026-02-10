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

@Injectable({
  providedIn: 'root'
})
export class ArticleService {

  constructor(
    private http: HttpClient,
    private dbService: DatabaseService,
    private healthCheckService: HealthCheckService
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
              await this.dbService.saveArticles(articlesWithZeroStock);
            }),
            catchError((error) => {
              console.error('Failed to fetch articles from API, attempting local:', error);
              return from(this.dbService.getArticles());
            })
          );
        } else {
          return from(this.dbService.getArticles());
        }
      })
    );
  }

  private fetchArticlesFromApi(): Observable<Article[]> {
    const url = `${environment.apiUrl}/api/v1/articles/enabled/all`;
    return this.http.get<ApiResponse<Article[]>>(url).pipe(
      map(response => response.data)
    );
  }

  getArticles(): Observable<Article[]> {
    return from(this.dbService.getArticles());
  }
}
