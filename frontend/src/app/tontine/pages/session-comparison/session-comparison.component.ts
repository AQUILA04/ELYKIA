import { Component, OnInit } from '@angular/core';
import { TontineSessionService } from '../../services/tontine-session.service';
import { TontineSession, SessionComparison, formatCurrency } from '../../types/tontine.types';

@Component({
  selector: 'app-session-comparison',
  templateUrl: './session-comparison.component.html',
  styleUrls: ['./session-comparison.component.scss']
})
export class SessionComparisonComponent implements OnInit {
  sessions: TontineSession[] = [];
  selectedYears: number[] = [];
  comparison: SessionComparison | null = null;
  loading = false;
  error: string | null = null;

  constructor(private sessionService: TontineSessionService) { }

  ngOnInit(): void {
    this.loadSessions();
  }

  private loadSessions(): void {
    this.loading = true;
    this.sessionService.getAllSessions().subscribe({
      next: (response) => {
        if (response.data) {
          this.sessions = response.data;
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des sessions';
        this.loading = false;
      }
    });
  }

  toggleYear(year: number): void {
    const index = this.selectedYears.indexOf(year);
    if (index > -1) {
      this.selectedYears.splice(index, 1);
    } else {
      if (this.selectedYears.length < 5) {
        this.selectedYears.push(year);
      }
    }
  }

  isYearSelected(year: number): boolean {
    return this.selectedYears.includes(year);
  }

  canCompare(): boolean {
    return this.selectedYears.length >= 2 && this.selectedYears.length <= 5;
  }

  compare(): void {
    if (!this.canCompare()) return;

    this.loading = true;
    this.error = null;
    this.sessionService.compareSessions(this.selectedYears).subscribe({
      next: (response) => {
        if (response.data) {
          this.comparison = response.data;
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors de la comparaison';
        this.loading = false;
      }
    });
  }

  formatCurrency(amount: number): string {
    return formatCurrency(amount);
  }

  getGrowthIcon(growth: number): string {
    return growth > 0 ? 'arrow_upward' : growth < 0 ? 'arrow_downward' : 'remove';
  }

  getGrowthClass(growth: number): string {
    return growth > 0 ? 'positive' : growth < 0 ? 'negative' : 'neutral';
  }
}
