import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type ClientPhotoKind = 'PROFIL' | 'CARD';
export type ClientPhotoSize = 'THUMB' | 'ORIGINAL';

export interface ClientPhotoUrlEntry {
  clientId: number;
  url: string | null;
  expiresAt?: string | null;
  legacy: boolean;
}

interface ApiResponse<T> {
  data: T;
}

interface MemoryEntry {
  url: string | null;
  expiresAtMs: number;
  legacy: boolean;
}

/** Mobile helper: asks the backend for short-lived MinIO GET links (never persisted). */
@Injectable({ providedIn: 'root' })
export class ClientPhotoUrlService {
  private readonly endpoint = `${environment.apiUrl}/api/v1/clients/photos/urls`;
  private readonly memory = new Map<string, MemoryEntry>();

  constructor(private readonly http: HttpClient) {}

  async getUrlMap(
    clientIds: number[],
    kind: ClientPhotoKind = 'PROFIL',
    size: ClientPhotoSize = 'THUMB'
  ): Promise<Map<number, ClientPhotoUrlEntry>> {
    const entries = await this.getUrls(clientIds, kind, size);
    return new Map(entries.map((e) => [e.clientId, e]));
  }

  async getUrls(
    clientIds: number[],
    kind: ClientPhotoKind = 'PROFIL',
    size: ClientPhotoSize = 'THUMB'
  ): Promise<ClientPhotoUrlEntry[]> {
    const ids = [...new Set((clientIds || []).filter((id) => id > 0))];
    if (ids.length === 0) {
      return [];
    }

    const now = Date.now();
    const fromCache: ClientPhotoUrlEntry[] = [];
    const toFetch: number[] = [];

    for (const id of ids) {
      const hit = this.memory.get(`${id}|${kind}|${size}`);
      if (hit && hit.expiresAtMs > now + 60_000) {
        fromCache.push({
          clientId: id,
          url: hit.url,
          expiresAt: new Date(hit.expiresAtMs).toISOString(),
          legacy: hit.legacy
        });
      } else {
        toFetch.push(id);
      }
    }

    if (toFetch.length === 0) {
      return fromCache;
    }

    const remote: ClientPhotoUrlEntry[] = [];
    for (let offset = 0; offset < toFetch.length; offset += 100) {
      const slice = toFetch.slice(offset, offset + 100);
      const body = await firstValueFrom(
        this.http.post<ApiResponse<ClientPhotoUrlEntry[]>>(this.endpoint, {
          clientIds: slice,
          kind,
          size
        })
      );
      const rows = body?.data ?? [];
      const stamped = Date.now();
      const seen = new Set<number>();
      for (const row of rows) {
        seen.add(row.clientId);
        const expiresAtMs = row.expiresAt ? Date.parse(row.expiresAt) : stamped + 50 * 60 * 1000;
        this.memory.set(`${row.clientId}|${kind}|${size}`, {
          url: row.url ?? null,
          expiresAtMs,
          legacy: !!row.legacy
        });
        remote.push(row);
      }
      for (const id of slice) {
        if (!seen.has(id)) {
          this.memory.set(`${id}|${kind}|${size}`, {
            url: null,
            expiresAtMs: stamped + 5 * 60 * 1000,
            legacy: false
          });
        }
      }
    }

    return fromCache.concat(remote);
  }
}
