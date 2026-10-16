import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';

export interface ArticleType {
  id?: number;
  name: string;
  code?: string;
  description?: string;
  photoUrl?: string | null;
  displayPhotoUrl?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ArticleTypeService {
  private apiUrl = `${environment.apiUrl}/api/v1/article-types`;

  constructor(private http: HttpClient, private tokenStorage: TokenStorageService) { }

  getHeader() {
    const token = this.tokenStorage.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  getTypes(page: number, size: number, search: string): Observable<any> {
    const headers = this.getHeader();
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search && search.trim() !== '') {
      params = params.set('search', search);
    }

    return this.http.get<any>(this.apiUrl, { headers, params });
  }

  getAllTypes(): Observable<any> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/all`, { headers });
  }

  createType(articleType: ArticleType): Observable<any> {
    const headers = this.getHeader();
    return this.http.post<any>(this.apiUrl, articleType, { headers });
  }

  updateType(id: number, articleType: ArticleType): Observable<any> {
    const headers = this.getHeader();
    return this.http.put<any>(`${this.apiUrl}/${id}`, articleType, { headers });
  }

  deleteType(id: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers });
  }

  getType(id: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers });
  }

  uploadPhoto(id: number, file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/${id}/photo`, form, { headers: this.getHeader() });
  }

  deletePhoto(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}/photo`, { headers: this.getHeader() });
  }
}
