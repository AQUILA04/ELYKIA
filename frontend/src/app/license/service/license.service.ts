import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LicenseService {
  private apiUrl = `${environment.apiUrl}/api/licences/renew`;
  constructor(private http: HttpClient) {}

  activateLicense(licenseKey: string): Observable<any> {
    return this.http.post(this.apiUrl, { 'activationCode': licenseKey }).pipe(
      catchError((error) => {
        console.error('Erreur lors de l\'activation de la licence', error);
        return throwError(error);
      })
    );
  }
}