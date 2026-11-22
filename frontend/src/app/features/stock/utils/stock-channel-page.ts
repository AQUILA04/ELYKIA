import { ActivatedRoute, Router } from '@angular/router';
import { StockChannel } from '../models/stock-channel';
import { StockChannelService } from '../services/stock-channel.service';

export interface StockChannelAdoption {
  channel: StockChannel;
  changed: boolean;
}

/** Partage la synchro `?channel=` entre les listes stock, sans dupliquer la navigation. */
export class StockChannelPage {
  channel: StockChannel = 'credit';
  private ready = false;

  constructor(
    private readonly stockChannel: StockChannelService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  adopt(raw: string | null): StockChannelAdoption | null {
    const next = this.stockChannel.resolve(raw);
    if (raw !== next) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { channel: next },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      return null;
    }
    const changed = this.ready && this.channel !== next;
    this.channel = next;
    this.stockChannel.remember(next);
    this.ready = true;
    return { channel: next, changed };
  }

  select(channel: StockChannel): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { channel, id: null },
      queryParamsHandling: 'merge'
    });
  }
}

export type StockListScreen = 'request' | 'return';

const LIST_HEADING: Record<StockListScreen, Record<StockChannel, string>> = {
  request: {
    tontine: 'Demandes de sortie tontine',
    credit: 'Demandes de sortie stock'
  },
  return: {
    tontine: 'Retours stock tontine',
    credit: 'Retours stock'
  }
};

const LIST_SUBJECT: Record<StockListScreen, string> = {
  request: 'Demandes de sortie',
  return: 'Retours de stock'
};

export function stockListHeading(screen: StockListScreen, channel: StockChannel): string {
  return LIST_HEADING[screen][channel];
}

export function stockListSubtitle(screen: StockListScreen, channel: StockChannel): string {
  const kind = channel === 'tontine' ? 'tontine' : 'crédit';
  return `${LIST_SUBJECT[screen]} ${kind} · Filtres période et commercial conservés à la navigation`;
}

export function stockListCrumb(channel: StockChannel): string {
  return channel === 'tontine' ? 'Mon stock tontine' : 'Mon stock';
}
