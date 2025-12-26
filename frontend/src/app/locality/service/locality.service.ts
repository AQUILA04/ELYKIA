import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { environment } from 'src/environments/environment';

export interface Locality {
  id: number;
  name: string;
}

export interface NewLocalityData {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocalityService {
  private apiUrl = `${environment.apiUrl}/api/v1/localities`;

  constructor(private http: HttpClient, private tokenStorage: TokenStorageService) {}

  getHeader() {
    const token = this.tokenStorage.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return headers;
  }

  // #### MÉTHODE ADAPTÉE POUR L'OPTION B ####
  getLocalities(page: number, size: number, sort: string, name: string = ''): Observable<any> {
    const headers = this.getHeader();
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    // Si un terme de recherche est présent, on utilise l'endpoint de recherche POST
    if (name && name.trim() !== '') {
      const searchUrl = `${this.apiUrl}/elasticsearch`;
      const body = { keyword: name.trim() };
      // La requête devient un POST
      return this.http.post<any>(searchUrl, body, { headers, params });
    } else {
      // Comportement normal (GET) si pas de recherche
      return this.http.get<any>(this.apiUrl, { headers, params });
    }
  }

  getAllLocalities(): Observable<Locality[]> {
    const headers = this.getHeader();
    return this.http.get<Locality[]>(this.apiUrl, { headers });
  }

  getLocalityById(id: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers });
  }

  addLocality(locality: NewLocalityData): Observable<any> {
    const headers = this.getHeader();
    return this.http.post<any>(this.apiUrl, locality, { headers });
  }

  updateLocality(locality: NewLocalityData): Observable<any> {
    const headers = this.getHeader();
    return this.http.put<any>(`${this.apiUrl}/${locality.id}`, locality, { headers });
  }

  deleteLocality(id: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers });
  }

  getTotalLocalities(): Observable<number> {
    const headers = this.getHeader();
    return this.http.get<any[]>(this.apiUrl, { headers }).pipe(
      map((localities: string | any[]) => localities.length)
    );
  }
}
