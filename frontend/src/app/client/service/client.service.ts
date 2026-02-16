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
  tontineCollector?: string; // Ajout du champ tontineCollector
  occupation: string;
  quarter: string;
  creditInProgress?: boolean;
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
  getClients(page: number, size: number, sort: string, username: any, search: string = ''): Observable<any> {
    const headers = this.getHeader();
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('username', username)
      .set('tontine', false);

    // Si une recherche est en cours, on utilise l'endpoint POST /elasticsearch
    if (search && search.trim() !== '') {
      const searchUrl = `${this.apiUrl}/elasticsearch`;
      const body = { keyword: search.trim() };
      return this.http.post<any>(searchUrl, body, { headers, params });
    } else {
      // Comportement normal si pas de recherche
      // On ajoute le paramètre 'username' seulement pour la requête GET standard
      const getParams = params.set('username', username);
      return this.http.get<any>(this.apiUrl, { params: getParams, headers });
    }
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
}
