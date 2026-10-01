import { Injectable } from '@angular/core';
import { AuthService } from 'src/app/auth/service/auth.service';
import { TontineFilterBarParams, TontineMemberDeliveryStatus } from '../types/tontine.types';

const PREFS_PREFIX = 'elykia.prefs.tontine.members.filters.';

@Injectable({
  providedIn: 'root'
})
export class TontineMemberFilterStorageService {

  constructor(private readonly authService: AuthService) {}

  load(): TontineFilterBarParams | null {
    const key = this.storageKey();
    if (!key) {
      return null;
    }
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as TontineFilterBarParams;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      return this.sanitize(parsed);
    } catch {
      return null;
    }
  }

  save(filters: TontineFilterBarParams): void {
    const key = this.storageKey();
    if (!key) {
      return;
    }
    const sanitized = this.sanitize(filters);
    if (this.isEmpty(sanitized)) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(sanitized));
  }

  clear(): void {
    const key = this.storageKey();
    if (!key) {
      return;
    }
    localStorage.removeItem(key);
  }

  private storageKey(): string | null {
    const username = this.authService.getUsername();
    if (!username) {
      return null;
    }
    return `${PREFS_PREFIX}${username}`;
  }

  private sanitize(filters: TontineFilterBarParams): TontineFilterBarParams {
    const result: TontineFilterBarParams = {};
    if (filters.search && filters.search.trim()) {
      result.search = filters.search.trim();
    }
    if (filters.deliveryStatus && filters.deliveryStatus !== 'ALL') {
      result.deliveryStatus = filters.deliveryStatus as TontineMemberDeliveryStatus;
    }
    if (filters.commercial && filters.commercial !== 'ALL') {
      result.commercial = filters.commercial;
    }
    if (typeof filters.carnetVerified === 'boolean') {
      result.carnetVerified = filters.carnetVerified;
    }
    if (filters.registrationSource === 'STAFF' || filters.registrationSource === 'CUSTOMER_SPACE') {
      result.registrationSource = filters.registrationSource;
    }
    return result;
  }

  private isEmpty(filters: TontineFilterBarParams): boolean {
    return !filters.search
      && !filters.deliveryStatus
      && !filters.commercial
      && typeof filters.carnetVerified !== 'boolean'
      && !filters.registrationSource;
  }
}
