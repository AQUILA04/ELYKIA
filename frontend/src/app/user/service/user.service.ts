import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  gender: string;
  password?: string;
  phone?: string;
  profilId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = `${environment.apiUrl}/api/v1/users`;
  private apiurl = `${environment.apiUrl}/api/auth/signup`;
  private promotersUrl = `${environment.apiUrl}/api/v1/promoters`;
  private username: string = '';

  constructor(private http: HttpClient) { }

  setUsername(username: string): void {
    this.username = username;
  }

  getUsername(): string | null {
    return localStorage.getItem('username');
  }
  // Add a new user
  addUser(user: any): Observable<any> {
    return this.http.post(`${this.apiurl}`, user);
  }

  // Get list of users
  getUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}`);
  }
  getUser(pageIndex: number, pageSize: number): Observable<any> {
    const url = `${this.baseUrl}?page=${pageIndex}&size=${pageSize}`;
    return this.http.get<any>(url);
  }

  getPromoters(pageIndex: number, pageSize: number): Observable<any> {
    const url = `${this.promotersUrl}?page=${pageIndex}&size=${pageSize}`;
    return this.http.get<any>(url);
  }

  // Get list of profiles
  getProfiles(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/profil/all`);

  }
  deleteUser(id: number): Observable<any> {
    const url = `${this.baseUrl}/${id}`;
    return this.http.delete(url);
  }
  getUserById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }
  updateUser(id: number, user: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, user);
  }

  assignProfile(id: number, profilId: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/assign-profile/${profilId}`, {});
  }

  addPermission(id: number, permission: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/permissions/add?permission=${permission}`, {});
  }

  removePermission(id: number, permission: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/permissions/remove?permission=${permission}`, {});
  }

}
