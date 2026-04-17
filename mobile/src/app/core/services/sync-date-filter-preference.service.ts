import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { SyncDateFilterOption } from '../../models/sync-date-filter.model';
import { DateFilter } from '../models/date-filter.model';

@Injectable({ providedIn: 'root' })
export class SyncDateFilterPreferenceService {
  private readonly STORAGE_KEY = 'sync_date_filter';
  private readonly DEFAULT_FILTER: SyncDateFilterOption = 'today';

  constructor(private readonly storage: Storage) {}

  async saveFilter(filter: SyncDateFilterOption): Promise<void> {
    await this.storage.set(this.STORAGE_KEY, filter);
  }

  async loadFilter(): Promise<SyncDateFilterOption> {
    try {
      const stored = await this.storage.get(this.STORAGE_KEY);
      if (stored && this.isValidFilter(stored)) {
        return stored;
      }
      return this.DEFAULT_FILTER;
    } catch (error) {
      console.error('Error loading sync date filter preference:', error);
      return this.DEFAULT_FILTER;
    }
  }

  resolveDateFilter(option: SyncDateFilterOption): DateFilter {
    const endDate = new Date();
    const endDateStr = this.formatDate(endDate);

    const daysMap: Record<SyncDateFilterOption, number> = {
      today: 0,
      '2days': 1,
      '3days': 2,
      week: 6,
      '2weeks': 14,
      month: 29,
    };

    const daysAgo = daysMap[option] ?? 0;
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysAgo);
    const startDateStr = this.formatDate(startDate);

    return { startDate: startDateStr, endDate: endDateStr };
  }

  private isValidFilter(value: string): value is SyncDateFilterOption {
    return ['today', '2days', '3days', 'week', '2weeks', 'month'].includes(value);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
