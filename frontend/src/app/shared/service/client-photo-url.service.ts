import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { finalize, map, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

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

interface CacheEntry {
  url: string | null;
  expiresAtMs: number;
  legacy: boolean;
}

/**
 * Fetches short-lived MinIO GET URLs for private client photos.
 * Do not persist these URLs; they expire (~60 min).
 */
@Injectable({ providedIn: 'root' })
export class ClientPhotoUrlService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/clients/photos/urls`;
  private readonly cache = new Map<string, CacheEntry>();
  /** In-flight batch requests keyed by kind+size+sorted ids to avoid duplicate POSTs. */
  private readonly inflight = new Map<string, Observable<ClientPhotoUrlEntry[]>>();

  constructor(private readonly http: HttpClient) {}

  getUrls(
    clientIds: number[],
    kind: ClientPhotoKind = 'PROFIL',
    size: ClientPhotoSize = 'THUMB'
  ): Observable<ClientPhotoUrlEntry[]> {
    const uniqueIds = [...new Set(clientIds.filter((id) => id != null && id > 0))];
    if (uniqueIds.length === 0) {
      return of([]);
    }

    const now = Date.now();
    const cached: ClientPhotoUrlEntry[] = [];
    const missing: number[] = [];

    for (const id of uniqueIds) {
      const hit = this.cache.get(this.cacheKey(id, kind, size));
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
      return of(cached);
    }

    const inflightKey = `${kind}:${size}:${[...missing].sort((a, b) => a - b).join(',')}`;
    let pending = this.inflight.get(inflightKey);
    if (!pending) {
      pending = this.http
        .post<ApiResponse<ClientPhotoUrlEntry[]>>(this.apiUrl, {
          clientIds: missing,
          kind,
          size
        })
        .pipe(
          map((res) => {
            const data = res?.data ?? [];
            const fetchedAt = Date.now();
            for (const entry of data) {
              const expiresAtMs = entry.expiresAt
                ? Date.parse(entry.expiresAt)
                : fetchedAt + 50 * 60 * 1000;
              this.cache.set(this.cacheKey(entry.clientId, kind, size), {
                url: entry.url ?? null,
                expiresAtMs,
                legacy: !!entry.legacy
              });
            }
            // Clients omitted (unauthorized) or not returned: cache as empty to avoid hammering
            const returned = new Set(data.map((e) => e.clientId));
            for (const id of missing) {
              if (!returned.has(id)) {
                this.cache.set(this.cacheKey(id, kind, size), {
                  url: null,
                  expiresAtMs: fetchedAt + 5 * 60 * 1000,
                  legacy: false
                });
              }
            }
            return data;
          }),
          finalize(() => this.inflight.delete(inflightKey)),
          shareReplay(1)
        );
      this.inflight.set(inflightKey, pending);
    }

    return pending.pipe(map((fetched) => [...cached, ...fetched]));
  }

  getUrl(
    clientId: number,
    kind: ClientPhotoKind = 'PROFIL',
    size: ClientPhotoSize = 'THUMB'
  ): Observable<ClientPhotoUrlEntry | null> {
    return this.getUrls([clientId], kind, size).pipe(
      map((list) => list.find((e) => e.clientId === clientId) ?? null)
    );
  }

  /** Peek cached URL without network (null if missing/expired). */
  peekUrl(clientId: number, kind: ClientPhotoKind, size: ClientPhotoSize): string | null {
    const hit = this.cache.get(this.cacheKey(clientId, kind, size));
    if (!hit || hit.expiresAtMs <= Date.now() + 60_000) {
      return null;
    }
    return hit.url;
  }

  invalidate(clientId?: number): void {
    if (clientId == null) {
      this.cache.clear();
      return;
    }
    const prefix = `${clientId}:`;
    for (const key of [...this.cache.keys()]) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  private cacheKey(clientId: number, kind: ClientPhotoKind, size: ClientPhotoSize): string {
    return `${clientId}:${kind}:${size}`;
  }
}
