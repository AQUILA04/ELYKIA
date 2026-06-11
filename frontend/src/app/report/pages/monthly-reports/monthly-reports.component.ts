import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MonthlyReportService } from '../../service/monthly-report.service';

interface MonthlyReportFileDto {
  id: number;
  reportType: string;
  fileName: string;
  commercialUsername?: string;
  createdDate?: string;
}

interface MonthlyReportYearNode {
  year: number;
  months: Record<string, MonthlyReportFileDto[]>;
}

interface MonthlyReportKpis {
  totalYears: number;
  totalMonths: number;
  totalFiles: number;
  latestLabel: string;
}

const MONTH_LABELS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

@Component({
  selector: 'app-monthly-reports',
  templateUrl: './monthly-reports.component.html',
  styleUrls: ['./monthly-reports.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class MonthlyReportsComponent implements OnInit, OnDestroy {
  tree: MonthlyReportYearNode[] = [];
  loading = false;
  generating = false;
  currentDate = new Date();
  lastUpdate = new Date();
  kpis: MonthlyReportKpis = {
    totalYears: 0,
    totalMonths: 0,
    totalFiles: 0,
    latestLabel: '—'
  };

  expandedYears = new Set<number>();
  expandedMonths = new Set<string>();

  private clockInterval?: ReturnType<typeof setInterval>;

  constructor(private readonly monthlyReportService: MonthlyReportService) {}

  ngOnInit(): void {
    this.loadTree();
    this.clockInterval = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  refresh(): void {
    this.loadTree();
  }

  loadTree(): void {
    this.loading = true;
    this.monthlyReportService.getTree().subscribe({
      next: (data) => {
        this.tree = (data ?? []) as MonthlyReportYearNode[];
        this.computeKpis();
        this.expandDefaults();
        this.lastUpdate = new Date();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  generatePreviousMonth(): void {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    this.generating = true;
    this.monthlyReportService.generate(now.getFullYear(), now.getMonth() + 1).subscribe({
      next: () => {
        this.generating = false;
        this.loadTree();
      },
      error: () => {
        this.generating = false;
      }
    });
  }

  download(file: MonthlyReportFileDto): void {
    this.monthlyReportService.download(file.id).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.fileName || 'monthly-report.pdf';
      anchor.click();
      window.URL.revokeObjectURL(url);
    });
  }

  monthEntries(months: Record<string, MonthlyReportFileDto[]> | undefined): { key: string; value: MonthlyReportFileDto[] }[] {
    return Object.entries(months || {})
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => Number(b.key) - Number(a.key));
  }

  monthLabel(monthKey: string): string {
    const month = Number(monthKey);
    return MONTH_LABELS[month] || `Mois ${monthKey}`;
  }

  monthKey(year: number, month: string): string {
    return `${year}-${month}`;
  }

  isYearExpanded(year: number): boolean {
    return this.expandedYears.has(year);
  }

  isMonthExpanded(year: number, month: string): boolean {
    return this.expandedMonths.has(this.monthKey(year, month));
  }

  toggleYear(year: number): void {
    if (this.expandedYears.has(year)) {
      this.expandedYears.delete(year);
    } else {
      this.expandedYears.add(year);
    }
  }

  toggleMonth(year: number, month: string): void {
    const key = this.monthKey(year, month);
    if (this.expandedMonths.has(key)) {
      this.expandedMonths.delete(key);
    } else {
      this.expandedMonths.add(key);
    }
  }

  reportTypeLabel(file: MonthlyReportFileDto): string {
    if (file.reportType === 'GENERAL') {
      return 'Rapport général';
    }
    if (file.commercialUsername) {
      return `Commercial — ${file.commercialUsername}`;
    }
    return 'Rapport commercial';
  }

  reportTypeBadgeClass(file: MonthlyReportFileDto): string {
    return file.reportType === 'GENERAL' ? 'badge-general' : 'badge-commercial';
  }

  formatFileDate(value?: string): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private computeKpis(): void {
    let totalMonths = 0;
    let totalFiles = 0;
    let latestYear = 0;
    let latestMonth = 0;

    for (const yearNode of this.tree) {
      const months = Object.keys(yearNode.months || {});
      totalMonths += months.length;
      for (const monthKey of months) {
        const files = yearNode.months[monthKey] || [];
        totalFiles += files.length;
        const monthNum = Number(monthKey);
        if (yearNode.year > latestYear || (yearNode.year === latestYear && monthNum > latestMonth)) {
          latestYear = yearNode.year;
          latestMonth = monthNum;
        }
      }
    }

    this.kpis = {
      totalYears: this.tree.length,
      totalMonths,
      totalFiles,
      latestLabel: latestYear > 0 ? `${this.monthLabel(String(latestMonth))} ${latestYear}` : '—'
    };
  }

  private expandDefaults(): void {
    if (this.tree.length > 0) {
      const firstYear = this.tree[0].year;
      this.expandedYears.add(firstYear);
      const months = this.monthEntries(this.tree[0].months);
      if (months.length > 0) {
        this.expandedMonths.add(this.monthKey(firstYear, months[0].key));
      }
    }
  }
}
