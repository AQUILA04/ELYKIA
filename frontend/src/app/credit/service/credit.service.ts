import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, throwError, catchError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { BaseHttpService } from 'src/app/shared/service/base-http.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';

// Enhanced interfaces with proper typing
import { CreditDistributionDetail, CreditTimelineDto } from '../types/credit.types';
// Interface pour les articles dans les réponses du serveur (avec id)
interface CreditArticleResponse {
  readonly id: number;
  readonly articleId: number;
  readonly quantity: number;
}

// Interface pour les articles dans les requêtes (sans id)
export interface CreditArticleRequest {
  readonly articleId: number;
  readonly quantity: number;
}

export interface Article {
  readonly id: number;
  readonly purchasePrice: number;
  readonly sellingPrice: number;
  readonly creditSalePrice: number;
  readonly name: string;
  readonly marque: string;
  readonly model: string;
  readonly type: string;
}

// Interface pour les données de formulaire de crédit
export interface CreditFormData {
  readonly clientId: number;
  readonly articles: readonly CreditArticleRequest[];
  readonly beginDate: string;
  readonly expectedEndDate: string | null;
  readonly totalAmount: number;
  readonly advance?: number;
}

// Enhanced interfaces for credit merge functionality with proper typing
export interface CreditSummaryDto {
  readonly id: number;
  readonly reference: string;
  readonly beginDate: string;
  readonly totalAmount: number;
}

export interface MergeCreditDto {
  readonly creditIds: readonly number[];
  readonly commercialUsername: string;
}

export interface ApiResponse<T> {
  readonly status: string;
  readonly statusCode: number;
  readonly message: string;
  readonly data: T | null;
}

// Interface pour le DTO de changement de mise journalière
export interface ChangeDailyStakeDto {
  creditId: number;
  dailyStake: number;
}


@Injectable({
  providedIn: 'root'
})
export class CreditService extends BaseHttpService {
  private apiUrl = `${environment.apiUrl}/api/v1/credits`;

  constructor(
    http: HttpClient,
    tokenStorage: TokenStorageService,
    errorHandler: ErrorHandlerService
  ) {
    super(http, tokenStorage, errorHandler);
  }

  getHeader() {
    const token = this.tokenStorage.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return headers;
  }

  // MODIFIÉ : La méthode accepte maintenant un 'searchTerm' pour la recherche côté serveur
  getCredit(page: number, size: number, searchTerm: string = ''): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    return this.get(this.apiUrl, { params });
  }

  // --- NOUVELLE MÉTHODE AJOUTÉE ICI ---
  changeDailyStake(dto: ChangeDailyStakeDto): Observable<any> {
    return this.patch(`${this.apiUrl}/change-daily-stake`, dto);
  }

  changeCollector(creditId: number, newCollector: string): Observable<any> {
    return this.post(`${this.apiUrl}/${creditId}/change-collector`, { newCollector }, {
      observe: 'response'
    }).pipe(
      map(response => response)
    );
  }

  getCollectorHistory(creditId: number): Observable<ApiResponse<any[]>> {
    return this.get(`${this.apiUrl}/${creditId}/collector-history`);
  }

  searchCredits(searchDto: any, page: number, size: number): Observable<any> {
    const headers = this.getHeader();
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'id,desc'); // Ajout du tri par défaut

    return this.http.post(`${this.apiUrl}/fetch`, searchDto, { headers, params });
  }

  createTontine(tontineData: CreditFormData): Observable<any> {
    return this.post(`${this.apiUrl}/create-tontine`, tontineData, {
      observe: 'response'
    }).pipe(
      map(response => response)
    );
  }

  // --- TOUTES LES AUTRES MÉTHODES SONT MAINTENANT PRÉSENTES ET CORRECTES ---

  validateCredit(id: number): Observable<any> {
    return this.patch(`${this.apiUrl}/validate/${id}`, null);
  }

  startCredit(id: number): Observable<any> {
    return this.patch(`${this.apiUrl}/start/${id}`, null);
  }

  getCreditById(id: number): Observable<any> {
    return this.get(`${this.apiUrl}/${id}`);
  }

  updateCredit(creditId: number, formData: CreditFormData): Observable<any> {
    return this.put(`${this.apiUrl}/${creditId}`, formData);
  }

  deleteCredit(id: number): Observable<any> {
    return this.delete(`${this.apiUrl}/${id}`);
  }

  addCredit(creditData: CreditFormData): Observable<any> {
    return this.post(this.apiUrl, creditData, { observe: 'response' }).pipe(
      map(response => response)
    );
  }

  distributeArticles(dto: any): Observable<any> {
    return this.patch(`${this.apiUrl}/distribute-articles`, dto);
  }

  getCreditsByCollector(): Observable<any> {
    return this.get(`${this.apiUrl}/by-collector`);
  }

  getCreditsByCommercial(username: string, page: number, size: number, sort: string): Observable<any> {
    return this.get(`${this.apiUrl}/by-commercial/${username}?page=${page}&size=${size}&sort=${sort}`);
  }

  getCreditHistoryByCommercial(username: string, page: number, size: number, sort: string): Observable<any> {
    return this.get(`${this.apiUrl}/history/by-commercial/${username}?page=${page}&size=${size}&sort=${sort}`);
  }

  getDelayedCreditByCommercial(username: string, page: number, size: number, sort: string): Observable<any> {
    return this.get(`${this.apiUrl}/delayed/by-commercial/${username}?page=${page}&size=${size}&sort=${sort}`);
  }

  getEndingCreditByCommercial(username: string, page: number, size: number, sort: string): Observable<any> {
    return this.get(`${this.apiUrl}/ending/by-commercial/${username}?page=${page}&size=${size}&sort=${sort}`);
  }

  getSortiesByCommercial(username: string, page: number, size: number, sort: string): Observable<any> {
    return this.get(`${this.apiUrl}/sorties/by-commercial/${username}?page=${page}&size=${size}&sort=${sort}`);
  }

  getSortiesHistoryByCommercial(username: string, page: number, size: number, sort: string): Observable<any> {
    return this.get(`${this.apiUrl}/sorties-history/by-commercial/${username}?page=${page}&size=${size}&sort=${sort}`);
  }

  getCreditsByClient(clientId: number, page: number, size: number, sort: string): Observable<any> {
    return this.get(`${this.apiUrl}/by-client/${clientId}?page=${page}&size=${size}&sort=${sort}`);
  }

  getCreditHistoryByClient(clientId: number, page: number, size: number, sort: string): Observable<any> {
    // Updated to use the new endpoint for timelines (cotisations)
    return this.get(`${this.apiUrl}/timelines/by-client/${clientId}?page=${page}&size=${size}&sort=${sort}`);
  }

  getPendingCreditsByClient(clientId: number, page: number, size: number, sort: string): Observable<any> {
    return this.get(`${this.apiUrl}/pending/by-client/${clientId}?page=${page}&size=${size}&sort=${sort}`);
  }

  getClientDetails(clientId: number): Observable<any> {
    return this.get(`${this.apiUrl}/client-details/${clientId}`);
  }

  getDistributionsByCredit(creditId: number, page: number, size: number, sort: string): Observable<any> {
    return this.get(`${this.apiUrl}/${creditId}/distributions?page=${page}&size=${size}&sort=${sort}`);
  }

  getEcheancesByCredit(creditId: number, page: number, size: number, sort: string): Observable<any> {
    return this.get(`${this.apiUrl}/${creditId}/timelines?page=${page}&size=${size}&sort=${sort}`);
  }

  getArticleQuantityDistributed(creditId: number, articleId: number): Observable<any> {
    return this.get(`${this.apiUrl}/article-quantity-distributed?creditId=${creditId}&articleId=${articleId}`);
  }

  getCreditDistributionDetails(creditId: number): Observable<ApiResponse<CreditDistributionDetail[]>> {
    return this.get(`${this.apiUrl}/${creditId}/distribution-details`);
  }

  // Enhanced methods for credit merge functionality with validation
  getMergeableCredits(commercialUsername: string): Observable<ApiResponse<CreditSummaryDto[]>> {
    // Input validation
    if (!commercialUsername || typeof commercialUsername !== 'string' || commercialUsername.trim().length === 0) {
      return throwError(() => new Error('Nom d\'utilisateur commercial requis'));
    }

    // Sanitize input
    const sanitizedUsername = this.sanitizeUsername(commercialUsername);
    if (!this.isValidUsername(sanitizedUsername)) {
      return throwError(() => new Error('Nom d\'utilisateur commercial invalide'));
    }

    return this.get(`${this.apiUrl}/mergeable/${encodeURIComponent(sanitizedUsername)}`);
  }

  mergeCredits(mergeData: MergeCreditDto): Observable<ApiResponse<string>> {
    // Input validation
    if (!this.isValidMergeData(mergeData)) {
      return throwError(() => new Error('Données de fusion invalides'));
    }

    // Sanitize and validate merge data
    const sanitizedMergeData: MergeCreditDto = {
      creditIds: [...mergeData.creditIds].filter(id => this.isValidCreditId(id)),
      commercialUsername: this.sanitizeUsername(mergeData.commercialUsername)
    };

    if (sanitizedMergeData.creditIds.length < 2) {
      return throwError(() => new Error('Au moins 2 crédits sont requis pour la fusion'));
    }

    if (!this.isValidUsername(sanitizedMergeData.commercialUsername)) {
      return throwError(() => new Error('Nom d\'utilisateur commercial invalide'));
    }

    return this.post(`${this.apiUrl}/merge`, sanitizedMergeData);
  }

  makeDailyStake(dto: CreditTimelineDto): Observable<any> {
    return this.post(`${this.apiUrl}/daily-stake`, dto);
  }

  getCreditArticles(creditId: number): Observable<any> {
    return this.get(`${this.apiUrl}/${creditId}/articles`);
  }

  getSalesDetails(stockItemId: number): Observable<any[]> {
    return this.get(`${this.apiUrl}/articles/details/${stockItemId}`);
  }

  // Input validation and sanitization helper methods
  private sanitizeUsername(username: string): string {
    if (!username) return '';

    return username
      .trim()
      .replace(/[<>"'&]/g, '') // Remove HTML/script injection characters
      .replace(/\s+/g, '') // Remove all whitespace
      .substring(0, 50); // Limit length
  }

  private isValidUsername(username: string): boolean {
    if (!username) return false;

    // Username should be alphanumeric with possible underscores/hyphens
    const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    return usernameRegex.test(username);
  }

  private isValidCreditId(creditId: number): boolean {
    return typeof creditId === 'number' &&
      creditId > 0 &&
      Number.isInteger(creditId) &&
      creditId <= Number.MAX_SAFE_INTEGER;
  }

  private isValidMergeData(mergeData: MergeCreditDto): boolean {
    if (!mergeData) return false;

    // Validate creditIds array
    if (!Array.isArray(mergeData.creditIds) || mergeData.creditIds.length < 2) {
      return false;
    }

    // Validate that all credit IDs are valid numbers
    if (!mergeData.creditIds.every(id => this.isValidCreditId(id))) {
      return false;
    }

    // Validate commercial username
    if (!mergeData.commercialUsername || typeof mergeData.commercialUsername !== 'string') {
      return false;
    }

    // Check for reasonable limits
    if (mergeData.creditIds.length > 10) { // Reasonable limit for merge operations
      return false;
    }

    return true;
  }


}
