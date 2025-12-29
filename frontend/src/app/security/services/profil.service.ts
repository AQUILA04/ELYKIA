import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface UserProfil {
    id?: number;
    name: string;
    description?: string;
    profilPermissions?: any[];
}

export interface AddPermissionDto {
    profilId: number;
    permissions: string[];
}

@Injectable({
    providedIn: 'root'
})
export class ProfilService {
    private baseUrl = `${environment.apiUrl}/api/v1/profils`;

    constructor(private http: HttpClient) { }

    getAll(pageIndex: number, pageSize: number): Observable<any> {
        const url = `${this.baseUrl}?page=${pageIndex}&size=${pageSize}`;
        return this.http.get<any>(url);
    }

    getAllList(): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/all`);
    }

    getById(id: number): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/${id}`);
    }

    create(profil: UserProfil): Observable<any> {
        return this.http.post<any>(this.baseUrl, profil);
    }

    update(id: number, profil: UserProfil): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/${id}`, profil);
    }

    delete(id: number): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/${id}`);
    }

    addPermissions(dto: AddPermissionDto): Observable<any> {
        return this.http.patch<any>(`${this.baseUrl}/add-permissions`, dto);
    }

    removePermission(id: number, permission: string): Observable<any> {
        return this.http.patch<any>(`${this.baseUrl}/${id}/remove-permission?permission=${permission}`, {});
    }
}
