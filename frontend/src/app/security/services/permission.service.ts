import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface UserPermission {
    id?: number;
    name: string;
    defaultName?: string;
}

@Injectable({
    providedIn: 'root'
})
export class PermissionService {
    private baseUrl = `${environment.apiUrl}/api/v1/permissions`;

    constructor(private http: HttpClient) { }

    getAll(pageIndex: number, pageSize: number): Observable<any> {
        const url = `${this.baseUrl}?page=${pageIndex}&size=${pageSize}`;
        return this.http.get<any>(url);
    }

    getAllList(): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/all`);
    }

    create(permission: UserPermission): Observable<any> {
        return this.http.post<any>(this.baseUrl, permission);
    }

    delete(id: number): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/${id}`);
    }
}
