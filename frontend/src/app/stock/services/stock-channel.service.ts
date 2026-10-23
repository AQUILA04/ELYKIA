import { Injectable } from '@angular/core';
import { Params } from '@angular/router';
import { AuthService } from '../../auth/service/auth.service';
import { STOCK_CHANNEL_QUERY, StockChannel, isStockChannel } from '../models/stock-channel';

const STORAGE_KEY = 'elykia.stock.channel';

@Injectable({
  providedIn: 'root'
})
export class StockChannelService {

  constructor(private authService: AuthService) {}

  canUseCredit(): boolean {
    return this.authService.hasRole('ROLE_STOCK_MANAGEMENT')
      || this.authService.hasRole('ROLE_STOREKEEPER');
  }

  canUseTontine(): boolean {
    return this.canUseCredit() || this.authService.hasRole('ROLE_REPORT');
  }

  showsSegment(): boolean {
    return this.canUseCredit() && this.canUseTontine();
  }

  resolve(raw: string | null | undefined): StockChannel {
    if (raw === 'tontine' && this.canUseTontine()) {
      return 'tontine';
    }
    if (raw === 'credit' && this.canUseCredit()) {
      return 'credit';
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'tontine' && this.canUseTontine()) {
      return 'tontine';
    }
    if (stored === 'credit' && this.canUseCredit()) {
      return 'credit';
    }
    if (this.canUseCredit()) {
      return 'credit';
    }
    return 'tontine';
  }

  remember(channel: StockChannel): void {
    sessionStorage.setItem(STORAGE_KEY, channel);
  }

  queryParams(channel: StockChannel, extra?: Params): Params {
    this.remember(channel);
    return { ...(extra ?? {}), [STOCK_CHANNEL_QUERY]: channel };
  }

  isExplicit(raw: string | null | undefined): raw is StockChannel {
    return isStockChannel(raw);
  }
}
