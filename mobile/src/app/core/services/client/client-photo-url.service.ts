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
  /** True when the photo is still only in legacy PhotoStore (transitional). */
  legacy: boolean;
}

interface ApiResponse<T> {
  data: T;
}

/**
 * Batch short-lived MinIO GET URLs for private client photos.
 * Do not persist these URLs in SQLite — they expire.
 */
@Injectable({ providedIn: 'root' })
export class ClientPhotoUrlService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/clients/photos/urls`;
  private readonly cache = new Map<string, { url: string | null; expiresAtMs: number; legacy: boolean }>();

  constructor(private readonly http: HttpClient) {}

  async getUrls(
    clientIds: number[],
    kind: ClientPhotoKind = 'PROFIL',
    size: ClientPhotoSize = 'THUMB'
  ): Promise<ClientPhotoUrlEntry[]> {
    const uniqueIds = [...new Set(clientIds.filter((id) => id != null && id > 0))];
    if (uniqueIds.length === 0) {
      return [];
    }

    const now = Date.now();
    const cached: ClientPhotoUrlEntry[] = [];
    const missing: number[] = [];

    for (const id of uniqueIds) {
      const hit = this.cache.get(this.key(id, kind, size));
      if (hit && hit.expiresAtMs > now + 60_000) {
        cached.push({
          clientId: id,
          url: hit.url,
          expiresAt: new Date(hit.expiresAtMs).toISOString(),
          legacy: hit.legacy
        });
      } else {
        missing.push(id);
      }
    }

    if (missing.length === 0) {
      return cached;
    }

    // API max batch = 200
    const chunks: number[][] = [];
    for (let i = 0; i < missing.length; i += 100) {
      chunks.push(missing.slice(i, i + 100));
    }

    const fetched: ClientPhotoUrlEntry[] = [];
    for (const chunk of chunks) {
      const res = await firstValueFrom(
        this.http.post<ApiResponse<ClientPhotoUrlEntry[]>>(this.apiUrl, {
          clientIds: chunk,
          kind,
          size
        })
      );
      const data = res?.data ?? [];
      const fetchedAt = Date.now();
      for (const entry of data) {
        const expiresAtMs = entry.expiresAt
          ? Date.parse(entry.expiresAt)
          : fetchedAt + 50 * 60 * 1000;
        this.cache.set(this.key(entry.clientId, kind, size), {
          url: entry.url ?? null,
          expiresAtMs,
          legacy: !!entry.legacy
        });
        fetched.push(entry);
      }
      const returned = new Set(data.map((e) => e.clientId));
      for (const id of chunk) {
        if (!returned.has(id)) {
          this.cache.set(this.key(id, kind, size), {
            url: null,
            expiresAtMs: fetchedAt + 5 * 60 * 1000,
            legacy: false
          });
        }
      }
    }

    return [...cached, ...fetched];
  }

  async getUrlMap(
    clientIds: number[],
    kind: ClientPhotoKind = 'PROFIL',
    size: ClientPhotoSize = 'THUMB'
  ): Promise<Map<number, ClientPhotoUrlEntry>> {
    const entries = await this.getUrls(clientIds, kind, size);
    return new Map(entries.map((e) => [e.clientId, e]));
  }

  private key(clientId: number, kind: ClientPhotoKind, size: ClientPhotoSize): string {
    return `${clientId}:${kind}:${size}`;
  }
}
