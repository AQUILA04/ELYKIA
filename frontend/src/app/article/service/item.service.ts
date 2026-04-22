import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';


export interface StockValues {
  purchaseTotal: number;
  creditSaleTotal: number;
  combinedTotal: number;
}

export interface Article {
  id: number;
  name: string;
  marque: string;
  model?: string;
  type: string;
  purchasePrice: number;
  sellingPrice: number;
  creditSalePrice?: number;
  stockQuantity?: number;
  reorderPoint?: number;
  optimalStockLevel?: number;
  averageMonthlySales?: number;
  stockTurnoverRate?: number;
  daysOfStockAvailable?: number;
  category?: string;
  isSeasonal?: boolean;
  lastRestockDate?: string;
  state?: 'ENABLED' | 'DISABLED' | 'DELETED';
  /** @deprecated Utiliser 'state' — alias de compatibilité pour list.component */
  status?: 'ENABLED' | 'DISABLED' | 'DELETED';
  // Audit fields — noms correspondant aux @JsonProperty dans Articles.java
  articleCreatedBy?: string;
  articleCreatedDate?: string;
  articleLastModifiedBy?: string;
  articleLastModifiedDate?: string;
}

export interface NewArticleData {
  id: number;
  name: string;
  model: string;
  marque: string;
  type: string;
  purchasePrice: number;
  sellingPrice: number;
  creditSalePrice: number;
  reorderPoint?: number;
  optimalStockLevel?: number;
  isSeasonal?: boolean;
}

export interface ArticleHistoryItem {
  id: number;
  operationType: 'ENTREE' | 'SORTIE' | 'RESET';
  initialQuantity: number;
  operationQuantity: number;
  finalQuantity: number;
  operationDate: string;
  operationUser: string;
}

export interface ArticleStateHistoryItem {
  id: number;
  previousState: 'ENABLED' | 'DISABLED' | 'DELETED';
  newState: 'ENABLED' | 'DISABLED' | 'DELETED';
  createdDate: string;
  createdBy: string;
}

export interface ArticleResponse {
  data: {
    content: Article[];
    totalElements: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private apiUrl = `${environment.apiUrl}/api/v1/articles`;

  constructor(private http: HttpClient,
    private tokenStorage: TokenStorageService
  ) { }

  getHeader() {
    const token = this.tokenStorage.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return headers;
  }

  getAllArticles(): Observable<ArticleResponse> {
    const headers = this.getHeader();
    const params = new HttpParams().set('size', '10000');
    return this.http.get<ArticleResponse>(this.apiUrl, { params, headers });
  }

  getAllEnabledArticles(): Observable<ArticleResponse> {
    const headers = this.getHeader();
    const params = new HttpParams().set('size', '10000');
    return this.http.get<ArticleResponse>(`${this.apiUrl}/enabled`, { params, headers });
  }

  // #### MÉTHODE ADAPTÉE POUR L'OPTION B ####
  getArticles(page: number, size: number, sort: string, search: string = ''): Observable<any> {
    const headers = this.getHeader();
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    // Si un terme de recherche est présent, on utilise l'endpoint de recherche POST
    if (search && search.trim() !== '') {
      const searchUrl = `${this.apiUrl}/elasticsearch`;
      const body = { keyword: search.trim() };
      // La requête devient un POST vers l'URL de recherche
      return this.http.post<any>(searchUrl, body, { headers, params });
    } else {
      // Comportement normal (GET) si pas de recherche
      return this.http.get<any>(this.apiUrl, { headers, params });
    }
  }

  getArticle(page: number, size: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.get(`${this.apiUrl}?page=${page}&size=${size}`, { headers });
  }
  getDetailedStockValues(): Observable<StockValues> {
    const headers = this.getHeader();
    const url = `${this.apiUrl}/detailed-stock-value`; // l'endpoint Spring Boot
    return this.http.get<StockValues>(url, { headers });
  }

  // AJOUTEZ CETTE MÉTHODE
  resetAllStock(): Observable<any> {
    const headers = this.getHeader();
    const url = `${this.apiUrl}/reset-stock`;
    return this.http.post(url, {}, { headers });
  }

  // AJOUTEZ CETTE MÉTHODE
  resetStockForArticle(articleId: number): Observable<any> {
    const headers = this.getHeader();
    const url = `${this.apiUrl}/${articleId}/reset-stock`;
    return this.http.post(url, {}, { headers });
  }

  disableArticle(id: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.post(`${this.apiUrl}/${id}/disable`, {}, { headers });
  }

  enableArticle(id: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.post(`${this.apiUrl}/${id}/enable`, {}, { headers });
  }

  disableArticles(ids: number[]): Observable<any> {
    const headers = this.getHeader();
    return this.http.post(`${this.apiUrl}/disable-batch`, ids, { headers });
  }

  enableArticles(ids: number[]): Observable<any> {
    const headers = this.getHeader();
    return this.http.post(`${this.apiUrl}/enable-batch`, ids, { headers });
  }

  outOfStock(page: number, size: number): Observable<any> {
    const headers = this.getHeader();
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get(`${this.apiUrl}/out-of-stock`, { params, headers });
  }

  nextOutOfStock(page: number, size: number): Observable<any> {
    const headers = this.getHeader();
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get(`${this.apiUrl}/next-out-of-stock`, { params, headers });
  }

  updateArticle(article: NewArticleData): Observable<Article> {
    const headers = this.getHeader();
    const url = `${this.apiUrl}/${article.id}`;
    const payload = {
      id: article.id,
      name: article.name,
      marque: article.marque,
      model: article.model,
      type: article.type,
      purchasePrice: article.purchasePrice,
      sellingPrice: article.sellingPrice,
      creditSalePrice: article.creditSalePrice,
      reorderPoint: article.reorderPoint,
      optimalStockLevel: article.optimalStockLevel,
      isSeasonal: article.isSeasonal
    };

    return this.http.put<Article>(url, payload, { headers });
  }

  addArticle(article: NewArticleData): Observable<Article> {
    const headers = this.getHeader();
    return this.http.post<Article>(this.apiUrl, article, { headers });
  }

  getArticleById(id: number): Observable<any> {
    const headers = this.getHeader();
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<any>(url, { headers });
  }

  deleteArticle(id: number): Observable<any> {
    const headers = this.getHeader();
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete(url, { headers });
  }

  getTotalArticles(): Observable<number> {
    const headers = this.getHeader();
    return this.http.get<any[]>(this.apiUrl, { headers }).pipe(
      map(items => items.length)
    );
  }

  getArticleHistory(id: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/${id}/history`, { headers });
  }

  getArticleStateHistory(id: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/${id}/state-history`, { headers });
  }
}
