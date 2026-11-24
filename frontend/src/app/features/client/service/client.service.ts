import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '@env/environment';
import { TokenStorageService } from '@shared/service/token-storage.service';

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
  commercialUsername?: string;
  creditCommercialUsername?: string;
  tontineCollector?: string;
  tontineCommercialUsername?: string;
  agencyCommercialUsername?: string;
  recoveryCommercialUsername?: string;
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
  profilPhotoThumbUrl?: string;
  cardPhotoThumbUrl?: string;
  profilPhoto?: string;
  latitude?: number;
  longitude?: number;
  /** STAFF | CUSTOMER_SPACE — origine d'inscription */
  registrationSource?: 'STAFF' | 'CUSTOMER_SPACE';
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
  commercialUsername?: string;
  creditCommercialUsername?: string;
  tontineCollector?: string;
  tontineCommercialUsername?: string;
  agencyCommercialUsername?: string;
  recoveryCommercialUsername?: string; // Ajout du champ tontineCollector
  occupation: string;
  quarter: string;
  creditInProgress?: boolean;

  // AJOUT DES NOUVELLES PROPRIÉTÉS
  iddoc?: string;
  profilPhoto?: string;
  latitude?: number;
  longitude?: number;
}

export interface ClientAdhesion {
  id: number;
  clientId: number;
  adhesionType: 'PERSONAL' | 'BUSINESS' | 'EVENT';
  status: string;
  adhesionFee: number;
  feeWaived: boolean;
  balance: number;
  creditCeiling: number;
  source: string;
  activatedAt?: string;
}

export interface AdhesionSubmission {
  id: number;
  clientId: number;
  adhesionType: 'PERSONAL' | 'BUSINESS' | 'EVENT';
  requestKind: 'SUBSCRIBE' | 'TOP_UP';
  mobileMoneyPhone: string;
  mobileMoneyAmount: number;
  mobileMoneyReference: string;
  notes?: string;
  status: string;
  createdAt?: string;
  rejectionReason?: string;
}

export type PortfolioActivityType = 'CREDIT' | 'TONTINE' | 'AGENCY' | 'RECOVERY';
export type CommercialAssignmentStatus = 'ACTIVE' | 'INACTIVE';
export type BulkPortfolioOperationMode = 'HANDOVER_RELAY' | 'ADD_CO_COMMERCIAL' | 'DEACTIVATE_COMMERCIAL' | 'REACTIVATE_COMMERCIAL';

export interface ClientCommercialAssignmentDto {
  id: number;
  clientId: number;
  commercialUsername: string;
  activityType: PortfolioActivityType;
  status: CommercialAssignmentStatus;
  primary: boolean;
  assignedAt: string;
  lastActivatedAt: string;
  deactivatedAt?: string;
  updatedBy?: string;
  statusReason?: string;
}

export interface ClientCommercialAssignmentHistoryDto {
  id: number;
  assignmentId?: number;
  clientId: number;
  commercialUsername: string;
  activityType: PortfolioActivityType;
  eventType: string;
  previousStatus?: CommercialAssignmentStatus;
  newStatus: CommercialAssignmentStatus;
  wasPrimary: boolean;
  primary: boolean;
  replacedByCommercialUsername?: string;
  reason?: string;
  performedBy: string;
  occurredAt: string;
}

export interface BulkPortfolioOperationRequest {
  mode: BulkPortfolioOperationMode;
  activityTypes: PortfolioActivityType[];
  sourceCommercialUsername?: string;
  targetCommercialUsername?: string;
  clientIds?: number[];
  quarter?: string;
  transferInProgressCredits: boolean;
  reason?: string;
}

export interface BulkPortfolioPreviewDto {
  impactedClientsCount: number;
  impactedAssignmentsCount: number;
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

  getClients(
    page: number,
    size: number,
    sort: string,
    username: any,
    search: string = '',
    tontine = false,
    collectorType?: string,
    registrationSource?: 'STAFF' | 'CUSTOMER_SPACE' | 'ALL' | null,
    activeOnly?: boolean
  ): Observable<any> {
    const headers = this.getHeader();
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort)
      .set('username', username ?? '')
      .set('tontine', String(tontine));

    if (collectorType && collectorType !== 'ALL') {
      params = params.set('collectorType', collectorType);
    }

    if (registrationSource && registrationSource !== 'ALL') {
      params = params.set('registrationSource', registrationSource);
    }

    if (activeOnly === true) {
      params = params.set('activeOnly', 'true');
    }

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

  exportClientsPdf(commercial: string): Observable<Blob> {
    const headers = this.getHeader();
    return this.http.get(`${this.apiUrl}/by-commercial/${encodeURIComponent(commercial)}/export/pdf`, {
      headers,
      responseType: 'blob'
    });
  }

  getClientByCommercial(username: string, page: number, size: number, sort: string, searchTerm: string = '', activeOnly?: boolean): Observable<any> {
    const headers = this.getHeader();
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    if (activeOnly === true) {
      params = params.set('activeOnly', 'true');
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

  getClientKpis(username?: string | null, collectorType?: string): Observable<ClientKpis> {
    const headers = this.getHeader();
    let params = new HttpParams();
    if (username) {
      params = params.set('username', username);
    }
    if (collectorType && collectorType !== 'ALL') {
      params = params.set('collectorType', collectorType);
    }
    return this.http.get<ApiResponse<ClientKpis>>(`${this.apiUrl}/kpis`, { headers, params }).pipe(
      map(response => response.data)
    );
  }

  getAdhesions(clientId: number): Observable<ClientAdhesion[]> {
    const headers = this.getHeader();
    return this.http.get<ApiResponse<ClientAdhesion[]>>(
      `${this.apiUrl}/${clientId}/adhesions`, { headers }
    ).pipe(map(response => response.data ?? []));
  }

  subscribeAdhesion(clientId: number, adhesionType: ClientAdhesion['adhesionType']): Observable<ClientAdhesion[]> {
    const headers = this.getHeader();
    return this.http.post<ApiResponse<ClientAdhesion[]>>(
      `${this.apiUrl}/${clientId}/adhesions`, { adhesionType }, { headers }
    ).pipe(map(response => response.data ?? []));
  }

  topUpAdhesion(clientId: number, adhesionType: ClientAdhesion['adhesionType'], amount: number): Observable<ClientAdhesion[]> {
    const headers = this.getHeader();
    return this.http.post<ApiResponse<ClientAdhesion[]>>(
      `${this.apiUrl}/${clientId}/adhesions/${adhesionType}/top-up`, { amount }, { headers }
    ).pipe(map(response => response.data ?? []));
  }

  getAdhesionSubmissions(clientId: number): Observable<AdhesionSubmission[]> {
    const headers = this.getHeader();
    return this.http.get<ApiResponse<AdhesionSubmission[]>>(
      `${this.apiUrl}/${clientId}/adhesion-submissions`, { headers }
    ).pipe(map(response => response.data ?? []));
  }

  validateAdhesionSubmission(clientId: number, submissionId: number): Observable<AdhesionSubmission> {
    const headers = this.getHeader();
    return this.http.post<ApiResponse<AdhesionSubmission>>(
      `${this.apiUrl}/${clientId}/adhesion-submissions/${submissionId}/validate`, {}, { headers }
    ).pipe(map(response => response.data));
  }

  rejectAdhesionSubmission(clientId: number, submissionId: number, reason: string): Observable<AdhesionSubmission> {
    const headers = this.getHeader();
    return this.http.post<ApiResponse<AdhesionSubmission>>(
      `${this.apiUrl}/${clientId}/adhesion-submissions/${submissionId}/reject`, { reason }, { headers }
    ).pipe(map(response => response.data));
  }

  getBusinessCreditAuthorizationHistory(clientId: number): Observable<BusinessCreditAuthorizationEvent[]> {
    const headers = this.getHeader();
    return this.http.get<ApiResponse<BusinessCreditAuthorizationEvent[]>>(
      `${this.apiUrl}/${clientId}/business-credit-authorization/history`, { headers }
    ).pipe(map(response => response.data ?? []));
  }

  bulkAssignCollectors(dto: {
    clientIds: number[];
    collector?: string;
    tontineCollector?: string;
    transferInProgressCredits?: boolean;
  }): Observable<ApiResponse<boolean>> {
    const headers = this.getHeader();
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/bulk-assign-collectors`, dto, { headers });
  }

  getClientCommercialAssignments(clientId: number): Observable<ClientCommercialAssignmentDto[]> {
    const headers = this.getHeader();
    return this.http.get<ClientCommercialAssignmentDto[]>(`${this.apiUrl}/${clientId}/commercial-assignments`, { headers });
  }

  getClientCommercialAssignmentHistory(clientId: number, activityType?: PortfolioActivityType): Observable<ClientCommercialAssignmentHistoryDto[]> {
    const headers = this.getHeader();
    let params = new HttpParams();
    if (activityType) params = params.set('activityType', activityType);
    return this.http.get<ClientCommercialAssignmentHistoryDto[]>(`${this.apiUrl}/${clientId}/commercial-assignments/history`, { headers, params });
  }

  assignClientCommercial(clientId: number, payload: { commercialUsername: string; activityType: PortfolioActivityType; primary: boolean; handoverFromExisting: boolean; reason?: string }): Observable<ClientCommercialAssignmentDto> {
    const headers = this.getHeader();
    return this.http.post<ClientCommercialAssignmentDto>(`${this.apiUrl}/${clientId}/commercial-assignments`, payload, { headers });
  }

  changeClientCommercialStatus(clientId: number, assignmentId: number, payload: { status: CommercialAssignmentStatus; primary?: boolean; reason?: string }): Observable<ClientCommercialAssignmentDto> {
    const headers = this.getHeader();
    return this.http.patch<ClientCommercialAssignmentDto>(`${this.apiUrl}/${clientId}/commercial-assignments/${assignmentId}/status`, payload, { headers });
  }

  previewBulkPortfolioOperation(payload: BulkPortfolioOperationRequest): Observable<BulkPortfolioPreviewDto> {
    const headers = this.getHeader();
    return this.http.post<BulkPortfolioPreviewDto>(`${this.apiUrl}/commercial-assignments/bulk-preview`, payload, { headers });
  }

  executeBulkPortfolioOperation(payload: BulkPortfolioOperationRequest): Observable<BulkPortfolioPreviewDto> {
    const headers = this.getHeader();
    return this.http.post<BulkPortfolioPreviewDto>(`${this.apiUrl}/commercial-assignments/bulk-execute`, payload, { headers });
  }
}
