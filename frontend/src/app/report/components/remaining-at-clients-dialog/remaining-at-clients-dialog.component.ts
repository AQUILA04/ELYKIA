import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DailyReportService } from '../../service/daily-report.service';
import { RemainingAtClientsCredit } from '../../models/remaining-at-clients.model';

export interface RemainingAtClientsDialogData {
  year: number;
  commercialUsername: string;
  remainingAtCommercialAmount: number;
  remainingAtClientAmount: number;
}

@Component({
  selector: 'app-remaining-at-clients-dialog',
  templateUrl: './remaining-at-clients-dialog.component.html',
  styleUrls: ['./remaining-at-clients-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class RemainingAtClientsDialogComponent implements OnInit, OnDestroy {
  @ViewChild('scrollSentinel') scrollSentinel?: ElementRef<HTMLElement>;

  loading = true;
  loadingMore = false;
  downloading = false;
  error: string | null = null;

  rows: RemainingAtClientsCredit[] = [];
  salesCount = 0;
  totalRemainingAmount = 0;

  private page = 0;
  private readonly pageSize = 25;
  private last = false;
  private loadSub?: Subscription;
  private observer?: IntersectionObserver;

  constructor(
    public dialogRef: MatDialogRef<RemainingAtClientsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RemainingAtClientsDialogData,
    private dailyReportService: DailyReportService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPage(true);
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
    this.observer?.disconnect();
  }

  loadPage(reset: boolean): void {
    if (reset) {
      this.page = 0;
      this.last = false;
      this.rows = [];
      this.loading = true;
      this.error = null;
    } else {
      if (this.loadingMore || this.last || this.loading) {
        return;
      }
      this.loadingMore = true;
    }

    this.loadSub?.unsubscribe();
    this.loadSub = this.dailyReportService
      .getYearlyRemainingCredits(this.data.year, this.data.commercialUsername, this.page, this.pageSize)
      .subscribe({
        next: (response) => {
          const page = response.content;
          this.salesCount = response.salesCount ?? 0;
          this.totalRemainingAmount = response.totalRemainingAmount ?? 0;
          const batch = page?.content ?? [];
          this.rows = reset ? batch : [...this.rows, ...batch];
          this.last = page?.last ?? true;
          this.page = (page?.number ?? this.page) + 1;
          this.loading = false;
          this.loadingMore = false;
          this.error = null;
          setTimeout(() => this.setupObserver(), 0);
        },
        error: (err) => {
          console.error('Error loading remaining credits', err);
          this.error = 'Impossible de charger les ventes encore dues.';
          this.loading = false;
          this.loadingMore = false;
        }
      });
  }

  retry(): void {
    this.loadPage(true);
  }

  openCredit(row: RemainingAtClientsCredit): void {
    if (!row?.id) {
      return;
    }
    this.dialogRef.close();
    this.router.navigate(['/credit/details', row.id]);
  }

  downloadPdf(): void {
    if (this.downloading) {
      return;
    }
    this.downloading = true;
    this.dailyReportService
      .exportYearlyRemainingCreditsPdf(this.data.year, this.data.commercialUsername)
      .subscribe({
        next: (data: Blob) => {
          const blob = new Blob([data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `reste_chez_les_clients_${this.data.commercialUsername}_${this.data.year}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          this.downloading = false;
        },
        error: (err) => {
          console.error('Error downloading remaining credits PDF', err);
          this.downloading = false;
        }
      });
  }

  close(): void {
    this.dialogRef.close();
  }

  private setupObserver(): void {
    this.observer?.disconnect();
    const el = this.scrollSentinel?.nativeElement;
    if (!el || this.last) {
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.loadPage(false);
        }
      },
      { root: el.parentElement, rootMargin: '80px', threshold: 0 }
    );
    this.observer.observe(el);
  }
}
