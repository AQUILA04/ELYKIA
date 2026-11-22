import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';

export interface CommercialStaff {
  id: number;
  name: string;
  phoneNumber?: string | null;
  serialNumber?: string | null;
  dateOfBirth?: string | null;
  photoUrl?: string | null;
  initials?: string;
}

export interface CommercialStaffDetail {
  person: CommercialStaff;
  assignments: CommercialAssignment[];
}

export interface CommercialAssignment {
  id: number;
  userId: number;
  username: string;
  promoterId: number;
  promoterName: string;
  photoUrl?: string | null;
  initials?: string;
  startDate: string;
  endDate?: string | null;
  current: boolean;
}

export interface CommercialAccount {
  userId: number;
  username: string;
  firstname?: string;
  lastname?: string;
  currentAssignmentId?: number | null;
  holderId?: number | null;
  holderName?: string | null;
  holderPhotoUrl?: string | null;
  holderInitials?: string | null;
  holderSince?: string | null;
}

export interface StaffWrite {
  name: string;
  phoneNumber?: string | null;
  serialNumber?: string | null;
  dateOfBirth?: string | null;
}

export interface AssignmentWrite {
  promoterId: number;
  startDate: string;
  endDate?: string | null;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { error?: { message?: string } })?.error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

@Injectable({ providedIn: 'root' })
export class CommercialDirectoryService {
  private readonly staffUrl = `${environment.apiUrl}/api/v1/commercial-staff`;
  private readonly accountsUrl = `${environment.apiUrl}/api/v1/commercial-accounts`;

  constructor(private readonly http: HttpClient) {}

  listStaff(): Observable<CommercialStaff[]> {
    return this.http.get<any>(this.staffUrl).pipe(map(response => response.data ?? []));
  }

  getStaff(id: number): Observable<CommercialStaffDetail> {
    return this.http.get<any>(`${this.staffUrl}/${id}`).pipe(map(response => response.data));
  }

  createStaff(body: StaffWrite): Observable<CommercialStaff> {
    return this.http.post<any>(this.staffUrl, body).pipe(map(response => response.data));
  }

  updateStaff(id: number, body: StaffWrite): Observable<CommercialStaff> {
    return this.http.put<any>(`${this.staffUrl}/${id}`, body).pipe(map(response => response.data));
  }

  deleteStaff(id: number): Observable<void> {
    return this.http.delete<any>(`${this.staffUrl}/${id}`).pipe(map(() => undefined));
  }

  uploadPhoto(id: number, file: File): Observable<CommercialStaff> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<any>(`${this.staffUrl}/${id}/photo`, form).pipe(map(response => response.data));
  }

  deletePhoto(id: number): Observable<CommercialStaff> {
    return this.http.delete<any>(`${this.staffUrl}/${id}/photo`).pipe(map(response => response.data));
  }

  listAccounts(): Observable<CommercialAccount[]> {
    return this.http.get<any>(this.accountsUrl).pipe(map(response => response.data ?? []));
  }

  history(userId: number): Observable<CommercialAssignment[]> {
    return this.http.get<any>(`${this.accountsUrl}/${userId}/assignments`).pipe(map(response => response.data ?? []));
  }

  createAssignment(userId: number, body: AssignmentWrite): Observable<CommercialAssignment> {
    return this.http.post<any>(`${this.accountsUrl}/${userId}/assignments`, body).pipe(map(response => response.data));
  }

  updateAssignment(id: number, body: AssignmentWrite): Observable<CommercialAssignment> {
    return this.http.put<any>(`${this.accountsUrl}/assignments/${id}`, body).pipe(map(response => response.data));
  }

  deleteAssignment(id: number): Observable<void> {
    return this.http.delete<any>(`${this.accountsUrl}/assignments/${id}`).pipe(map(() => undefined));
  }
}
