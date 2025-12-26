import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { environment } from 'src/environments/environment';

export interface Inventory {
  id: number;
  name: string;
  marque: string;
  model: string;
  type: string;
  stockQuantity: number | null;
}
export interface ApiResponse {
  status: string;
  statusCode: number;
  message: string;
  service: string;
  data: {
    page: any;
    content:any[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private apiUrl = `${environment.apiUrl}/api/v1/articles`;

  constructor(private http: HttpClient,
    private tokenStorage : TokenStorageService,
  ) {}
  getHeader(){
    const token = this.tokenStorage.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return headers;
  }

  getInventories(page: number, size: number): Observable<ApiResponse> {
    const headers= this.getHeader();
    return this.http.get<ApiResponse>(`${this.apiUrl}?page=${page}&size=${size}`, {headers});
  }
  addInventories(payload: any): Observable<any> {
    const headers= this.getHeader();
    return this.http.patch(`${this.apiUrl}/make-stock-entries`, payload, {headers});
  }
  searchInventories(keyword: string, page: number, size: number): Observable<ApiResponse> {
    const headers = this.getHeader();
    const body = { keyword };

    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http.post<ApiResponse>(
      `${this.apiUrl}/elasticsearch`,
      body,
      { headers, params }
    );
  }


}
