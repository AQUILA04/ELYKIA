import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export type ClientActivationStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';
export type CustomerSubmissionStatus = 'INITIE' | 'VALIDE' | 'REJETE';

export interface ClientRegistration {
  clientId: number;
  firstname: string;
  lastname: string;
  fullName: string;
  phone: string;
  address?: string;
  quarter?: string;
  dateOfBirth?: string;
  occupation?: string;
  cardType?: string;
  cardID?: string;
  /** URL MinIO photo originale (aperçu agrandi). */
  profilPhotoUrl?: string;
  /** URL MinIO miniature — préférée pour liste / vignette. */
  profilPhotoThumbUrl?: string;
  cardPhotoUrl?: string;
  cardPhotoThumbUrl?: string;
  activationStatus: ClientActivationStatus;
  collector?: string;
  tontineCollector?: string;
  registeredAt?: string;
  hasInitialDeposit: boolean;
  initialDepositId?: number;
  initialDepositStatus?: CustomerSubmissionStatus;
  initialDepositAmount?: number;
  initialDepositPhone?: string;
  initialDepositReference?: string;
  initialDepositHasProof?: boolean;
  initialDepositProofContentType?: string;
  activationRejectionReason?: string;
}

export interface ClientRegistrationPage {
  content: ClientRegistration[];
  totalElements: number;
  number: number;
  size: number;
  totalPages: number;
}

interface ApiResponse<T> {
  data: T;
}

interface PageResponse<T> {
  content: T[];
  totalElements?: number;
  number?: number;
  size?: number;
  totalPages?: number;
}

@Injectable({ providedIn: 'root' })
export class ClientRegistrationService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/client-registrations`;
  private readonly promotersUrl = `${environment.apiUrl}/api/v1/promoters/all`;

  constructor(private http: HttpClient) {}

  list(
    status: ClientActivationStatus = 'PENDING',
    hasInitialDeposit?: boolean | null,
    page = 0,
    size = 20
  ): Observable<ClientRegistrationPage> {
    let params = new HttpParams()
      .set('status', status)
      .set('page', String(page))
      .set('size', String(size));
    if (hasInitialDeposit === true || hasInitialDeposit === false) {
      params = params.set('hasInitialDeposit', String(hasInitialDeposit));
    }
    return this.http
      .get<ApiResponse<PageResponse<ClientRegistration> | ClientRegistration[]>>(this.apiUrl, { params })
      .pipe(map((res) => {
        const data = res?.data as PageResponse<ClientRegistration> | ClientRegistration[] | undefined;
        if (Array.isArray(data)) {
          return {
            content: data,
            totalElements: data.length,
            number: page,
            size,
            totalPages: 1,
          };
        }
        const content = data?.content ?? [];
        const totalElements = data?.totalElements ?? content.length;
        const pageSize = data?.size ?? size;
        const totalPages = data?.totalPages
          ?? Math.max(1, Math.ceil(totalElements / Math.max(pageSize, 1)));
        return {
          content,
          totalElements,
          number: data?.number ?? page,
          size: pageSize,
          totalPages,
        };
      }));
  }

  get(clientId: number): Observable<ClientRegistration> {
    return this.http
      .get<ApiResponse<ClientRegistration>>(`${this.apiUrl}/${clientId}`)
      .pipe(map((res) => res.data));
  }

  activate(clientId: number, body: {
    collector: string;
    tontineCollector: string;
    validateInitialDeposit?: boolean;
  }): Observable<ClientRegistration> {
    return this.http
      .post<ApiResponse<ClientRegistration>>(`${this.apiUrl}/${clientId}/activate`, body)
      .pipe(map((res) => res.data));
  }

  reject(clientId: number, reason: string): Observable<ClientRegistration> {
    return this.http
      .post<ApiResponse<ClientRegistration>>(`${this.apiUrl}/${clientId}/reject`, { reason })
      .pipe(map((res) => res.data));
  }

  getAgents(): Observable<any[]> {
    return this.http.get<any>(this.promotersUrl).pipe(
      map((res) => Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
    );
  }

  downloadDepositProof(depositId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/initial-deposits/${depositId}/proof`, { responseType: 'blob' });
  }
}
