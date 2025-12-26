import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http'; // <-- MODIFIÉ : HttpParams a été ajouté
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AuthService } from "../../auth/service/auth.service";


export interface Account {
  client: any;
  id: number;
  accountNumber: string;
  clientId: number;
  accountBalance: number;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private apiUrl = `${environment.apiUrl}/api/v1/accounts`;

  constructor(private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private authService: AuthService
  ) { }

  getHeader() {
    const token = this.tokenStorage.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return headers;
  }

  // MODIFIÉ : La méthode accepte maintenant 'search' et utilise HttpParams
  getAccount(page: number, size: number, search: string): Observable<any> {
    const headers = this.getHeader();
    const currentUser: any = this.authService.getCurrentUser();

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('username', currentUser.username);

    // On ajoute le paramètre de recherche seulement s'il n'est pas vide
    if (search && search.trim() !== '') {
      params = params.set('search', search);
    }

    return this.http.get(this.apiUrl, { headers, params });
  }

  getAllAccount(): Observable<Account[]> {
    const headers = this.getHeader();
    return this.http.get<Account[]>(this.apiUrl, { headers }); // Ajout des headers pour la cohérence
  }

  getAccounts(): Observable<any> {
    const headers = this.getHeader();
    return this.http.get<any>(this.apiUrl, { headers });
  }

  // Get account by ID
  getAccountById(id: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers });
  }

  // Add new account
  addAccount(accountData: any): Observable<any> {
    const headers = this.getHeader();
    return this.http.post(`${this.apiUrl}`, accountData, { headers });
  }

  // Update account
  updateAccount(accountId: any, formData: any): Observable<any> {
    const headers = this.getHeader();
    return this.http.put(`${this.apiUrl}/${accountId}`, formData, { headers });
  }

  // Delete account
  deleteAccount(id: number): Observable<any> {
    const headers = this.getHeader();
    const url = `${this.apiUrl}/${id}`
    return this.http.delete(url, { headers });
  }

  checkAccountNumberExists(accountNumber: string): Observable<boolean> {
    const headers = this.getHeader();
    return this.http.get<boolean>(`${this.apiUrl}/exists?accountNumber=${accountNumber}`, { headers });
  }

  getTotalAccount(): Observable<number> {
    return this.getAccount(0, 1, '').pipe(
      map((response: any) => {
        if (response.statusCode === 200 && response.data && response.data.page) {
          return response.data.page.totalElements;
        }
        return 0;
      })
    );
  }

  activateAccount(id: number): Observable<any> {
    const headers = this.getHeader();
    // Un POST ne devrait pas avoir de body vide comme ça, mais je garde la logique existante
    // Idéalement, le backend n'attendrait pas de body pour cette requête.
    return this.http.post(`${this.apiUrl}/activate/${id}`, {}, { headers });
  }

  deactivateAccount(id: number): Observable<any> {
    const headers = this.getHeader();
    return this.http.post(`${this.apiUrl}/closed/${id}`, {}, { headers });
  }

}
