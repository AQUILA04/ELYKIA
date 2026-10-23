export type StockChannel = 'credit' | 'tontine';

export const STOCK_CHANNEL_QUERY = 'channel';

export function isStockChannel(value: string | null | undefined): value is StockChannel {
  return value === 'credit' || value === 'tontine';
}
