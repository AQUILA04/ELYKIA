import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { environment } from 'src/environments/environment';
import { ReturnArticlesDto } from '../../history/back2-store/models/return-articles.dto';

@Injectable({
  providedIn: 'root'
})
export class OutService {
  private apiUrl = `${environment.apiUrl}/api/v1/credits`;
  private baseUrl = `${environment.apiUrl}/api/v1/`;

  constructor(private http: HttpClient, private tokenStorage: TokenStorageService) {}

  getHeader(){
    const token = this.tokenStorage.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return headers;
  }

  startCredit(id: number): Observable<any> {
    const headers= this.getHeader();
    return this.http.patch(`${this.apiUrl}/start/${id}`, null, {headers});
  }

  getAllOut(page: number, pageSize: number, startDate?: string, endDate?: string): Observable<any> {
      const headers = this.getHeader();
      // On change 'const' en 'let' pour pouvoir modifier params
      let params = new HttpParams()
        .set('page', page.toString())
        .set('size', pageSize.toString());

      // On ajoute les paramètres de date s'ils existent
      if (startDate && endDate) {
        params = params.append('startDate', startDate);
        params = params.append('endDate', endDate);
      }

      return this.http.get(`${this.apiUrl}/validated`, { headers, params });
    }

  getOutById(id: number): Observable<any> {
    const headers= this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/${id}`, {headers});
  }

  // ############ MÉTHODE AJOUTÉE ############
  /**
   * Appelle l'API pour obtenir le montant total des sorties sur une période.
   * @param startDate La date de début au format AAAA-MM-JJ.
   * @param endDate La date de fin au format AAAA-MM-JJ.
   */
  getTotalDisbursed(startDate: string, endDate: string): Observable<any> {
    const headers = this.getHeader();
    const url = `${this.apiUrl}/summary/total-disbursed`;

    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get(url, { headers, params });
  }
  // #########################################

  getHistory(page: number, pageSize: number, sort: string): Observable<any> {
    const headers = this.getHeader();
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', pageSize.toString())
      .set('sort', sort);

    return this.http.get(`${this.apiUrl}/history`, { headers, params });
  }

  deleteCredit(id: number): Observable<any> {
    const headers= this.getHeader();
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete(url, {headers});
  }

  getBackToStore(creditId: number): Observable<any> {
    const headers= this.getHeader();
    const url = `${this.apiUrl}/back-to-store/${creditId}`;
    return this.http.get(url, {headers});
  }

  makeBackToStore(dto: ReturnArticlesDto): Observable<any> {
    const headers = this.getHeader();
    return this.http.patch(`${this.apiUrl}/back-to-store`, dto, { headers });
  }

  generatePdf() {
    const headers = this.getHeader();
    return this.http.get(`${this.apiUrl}/item-release-sheet/pdf/current-date`, { headers });
  }

  listPdfFiles() {
    const headers = this.getHeader();
    return this.http.get(`${this.baseUrl}pdf/list-today-files`, { headers });
  }

  listOldReleaseDoc() {
    const headers = this.getHeader();
    return this.http.get(`${this.baseUrl}pdf/list-old-files`, { headers });
  }

  downloadFile(filename: string) {
    return this.http.get(`${this.baseUrl}pdf/download/${filename}`, {
      headers: this.getHeader(),
      responseType: 'blob'
    });
  }

  downloadSelected(filenames: string[]) {
    return this.http.post(`${this.baseUrl}pdf/download-selected`, filenames, {
      headers: this.getHeader(),
      responseType: 'blob'
    });
  }

  downloadAllToday() {
    return this.http.get(`${this.baseUrl}pdf/download-all-today`, {
      headers: this.getHeader(),
      responseType: 'blob'
    });
  }

  downloadByReleaseDate(filename: string) {
    return this.http.get(`${this.baseUrl}pdf/download-by-release-date/${filename}`, {
      headers: this.getHeader(),
      responseType: 'blob'
    });
  }

}
