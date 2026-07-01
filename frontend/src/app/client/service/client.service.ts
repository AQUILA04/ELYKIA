import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';

// #### INTERFACE CLIENT MISE À JOUR ####
export interface Client {
  id: number;
  firstname: string;
  lastname: string;
  address: string;
  phone: string;
  cardID: string;
  cardType: string;
  dateOfBirth: string;
  IDDoc: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactPersonAddress: string;
  collector: string;
  tontineCollector?: string;
  occupation: string;
  quarter: string;
  creditInProgress?: boolean;
  businessCreditInProgress?: boolean;
  businessCreditAuthorized?: boolean;
  businessCreditAuthorizedBy?: string;
  businessCreditAuthorizedAt?: string;
  isTontineMember?: boolean;
  hasOrderInProgress?: boolean;
  iddoc?: string;
  clientType: string;
  profilPhotoUrl?: string;
  cardPhotoUrl?: string;
  profilPhoto?: string;
  latitude?: number;
  longitude?: number;
}

// #### INTERFACE NEWCLIENTDATA MISE À JOUR ####
export interface NewClientData {
  id: number;
  firstname: string;
  lastname: string;
  address: string;
  phone: string;
  cardID: string;
  cardType: string;
  dateOfBirth: string;
  IDDoc: string; // Gardé pour la compatibilité
  contactPersonName: string;
  contactPersonPhone: string;
  contactPersonAddress: string;
  collector: string;
  tontineCollector?: string; // Ajout du champ tontineCollector
  occupation: string;
  quarter: string;
  creditInProgress?: boolean;

  // AJOUT DES NOUVELLES PROPRIÉTÉS
  iddoc?: string;
  profilPhoto?: string;
  latitude?: number;
  longitude?: number;
}

export interface ApiResponse<T> {
  status: string;
  statusCode: number;
  message: string;
  service: string;
  data: T;
}

export interface ClientKpis {
  totalRegistered: number;
  withActiveCredit: number;
  tontineMembers: number;
  withoutCreditNorTontine: number;
}

export interface BusinessCreditAuthorizationEvent {
  id: number;
  clientId: number;
  action: 'AUTHORIZED' | 'REVOKED';
  performedBy: string;
  performedAt: string;
}


@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private apiUrl = `${environment.apiUrl}/api/v1/clients`;
  private baseUrl = `${environment.apiUrl}/api/v1/promoters/all`;

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

  // #### MÉTHODE MODIFIÉE POUR LA RECHERCHE ####
  getClients(page: number, size: number, sort: string, username: any, search: string = '', tontine = false): Observable<any> {
    const headers = this.getHeader();
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('username', username ?? '')
      .set('tontine', String(tontine));

    // Si une recherche est en cours, on utilise l'endpoint POST /elasticsearch
    if (search && search.trim() !== '') {
      const searchUrl = `${this.apiUrl}/elasticsearch`;
      const body = { keyword: search.trim() };
      return this.http.post<any>(searchUrl, body, { headers, params });
    }

    return this.http.get<any>(this.apiUrl, { params, headers });
  }


  getAgents(): Observable<any[]> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.baseUrl}`, { headers }).pipe(
      map(response => response.data)
    );
  }

  getallClients(): Observable<Client[]> {
    const headers = this.getHeader();
    return this.http.get<Client[]>(this.apiUrl, { headers });
  }

  getClient(id: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers });
  }

  getClientById(id: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers });
  }

  getProfilPhotoStream(id: number): Observable<Blob> {
    const headers = this.getHeader();
    return this.http.get(`${this.apiUrl}/profil-photo-stream/${id}`, { headers, responseType: 'blob' });
  }

  getClientByCommercial(username: string, page: number, size: number, sort: string, searchTerm: string = ''): Observable<any> {
    const headers = this.getHeader();
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    return this.http.get<any>(`${this.apiUrl}/by-commercial/${username}`, { params, headers });
  }

  addClient(clientData: FormData): Observable<Client> {
    const headers = this.getHeader();
    return this.http.post<Client>(this.apiUrl, clientData, { headers });
  }

  updateClient(id: number, clientData: FormData): Observable<any> {
    const headers = this.getHeader();
    return this.http.put<any>(`${this.apiUrl}/${id}`, clientData, { headers });
  }

  deleteClient(id: number): Observable<void> {
    const headers = this.getHeader();
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
  }

  getTotalClients(): Observable<number> {
    const headers = this.getHeader();
    return this.http.get<any[]>(this.apiUrl, { headers }).pipe(
      map(clients => clients.length)
    );
  }

  getClientKpis(username?: string | null): Observable<ClientKpis> {
    const headers = this.getHeader();
    let params = new HttpParams();
    if (username) {
      params = params.set('username', username);
    }
    return this.http.get<ApiResponse<ClientKpis>>(`${this.apiUrl}/kpis`, { headers, params }).pipe(
      map(response => response.data)
    );
  }

  authorizeBusinessCredit(clientId: number): Observable<ApiResponse<Client>> {
    const headers = this.getHeader();
    return this.http.post<ApiResponse<Client>>(
      `${this.apiUrl}/${clientId}/business-credit-authorization`, {}, { headers });
  }

  revokeBusinessCreditAuthorization(clientId: number): Observable<ApiResponse<Client>> {
    const headers = this.getHeader();
    return this.http.delete<ApiResponse<Client>>(
      `${this.apiUrl}/${clientId}/business-credit-authorization`, { headers });
  }

  getBusinessCreditAuthorizationHistory(clientId: number): Observable<BusinessCreditAuthorizationEvent[]> {
    const headers = this.getHeader();
    return this.http.get<ApiResponse<BusinessCreditAuthorizationEvent[]>>(
      `${this.apiUrl}/${clientId}/business-credit-authorization/history`, { headers }
    ).pipe(map(response => response.data ?? []));
  }
}
