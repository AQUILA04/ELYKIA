import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { AiChatService } from '../../services/ai-chat.service';
import { AiAdminStats } from '../../models/ai-admin.models';

@Component({
  selector: 'app-ai-admin-stats',
  templateUrl: './ai-admin-stats.component.html',
  styleUrls: ['./ai-admin-stats.component.scss'],
})
export class AiAdminStatsComponent implements OnInit {
  stats: AiAdminStats | null = null;
  loading = false;
  periodDays = 30;
  intentEntries: { intent: string; count: number }[] = [];

  constructor(private readonly aiChatService: AiChatService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading = true;
    this.aiChatService
      .getAdminStats(this.periodDays)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (stats) => {
          this.stats = stats;
          this.intentEntries = Object.entries(stats.intentDistribution ?? {}).map(([intent, count]) => ({
            intent,
            count,
          }));
        },
        error: () => {
          this.stats = null;
          this.intentEntries = [];
        },
      });
  }

  onPeriodChange(): void {
    this.loadStats();
  }

  formatDate(value: string): string {
    if (!value) {
      return '—';
    }
    return new Date(value).toLocaleString('fr-FR');
  }
}
