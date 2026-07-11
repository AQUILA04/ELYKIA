import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  ApiResponse,
  JobApplication,
  JobOffer,
  JobOfferUpsert,
  PageResult,
} from '../models/recruitment.model';

@Injectable()
export class RecruitmentService {
  private readonly offersUrl = `${environment.apiUrl}/api/v1/recruitment/offers`;
  private readonly applicationsUrl = `${environment.apiUrl}/api/v1/recruitment/applications`;

  constructor(private http: HttpClient) {}

  listOffers(page = 0, size = 10): Observable<PageResult<JobOffer>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'id,desc');
    return this.http
      .get<ApiResponse<PageResult<JobOffer>>>(this.offersUrl, { params })
      .pipe(map((res) => res.data));
  }

  getOffer(id: number): Observable<JobOffer> {
    return this.http
      .get<ApiResponse<JobOffer>>(`${this.offersUrl}/${id}`)
      .pipe(map((res) => res.data));
  }

  createOffer(dto: JobOfferUpsert, imageFile?: File): Observable<JobOffer> {
    return this.http
      .post<ApiResponse<JobOffer>>(this.offersUrl, this.buildOfferFormData(dto, imageFile))
      .pipe(map((res) => res.data));
  }

  updateOffer(id: number, dto: JobOfferUpsert, imageFile?: File): Observable<JobOffer> {
    return this.http
      .put<ApiResponse<JobOffer>>(`${this.offersUrl}/${id}`, this.buildOfferFormData(dto, imageFile))
      .pipe(map((res) => res.data));
  }

  publishOffer(id: number): Observable<JobOffer> {
    return this.http
      .post<ApiResponse<JobOffer>>(`${this.offersUrl}/${id}/publish`, null)
      .pipe(map((res) => res.data));
  }

  withdrawOffer(id: number): Observable<JobOffer> {
    return this.http
      .post<ApiResponse<JobOffer>>(`${this.offersUrl}/${id}/withdraw`, null)
      .pipe(map((res) => res.data));
  }

  deleteOffer(id: number): Observable<unknown> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.offersUrl}/${id}`)
      .pipe(map((res) => res.data));
  }

  listApplications(page = 0, size = 10, jobOfferId?: number): Observable<PageResult<JobApplication>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'submittedAt,desc');
    if (jobOfferId != null) {
      params = params.set('jobOfferId', jobOfferId.toString());
    }
    return this.http
      .get<ApiResponse<PageResult<JobApplication>>>(this.applicationsUrl, { params })
      .pipe(map((res) => res.data));
  }

  getApplication(id: number): Observable<JobApplication> {
    return this.http
      .get<ApiResponse<JobApplication>>(`${this.applicationsUrl}/${id}`)
      .pipe(map((res) => res.data));
  }

  downloadCv(id: number): Observable<Blob> {
    return this.http.get(`${this.applicationsUrl}/${id}/cv`, { responseType: 'blob' });
  }

  private buildOfferFormData(dto: JobOfferUpsert, imageFile?: File): FormData {
    const formData = new FormData();
    formData.append(
      'offer',
      new Blob([JSON.stringify(dto)], { type: 'application/json' })
    );
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return formData;
  }
}
