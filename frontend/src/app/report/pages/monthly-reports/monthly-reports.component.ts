import { Component, OnInit } from '@angular/core';
import { MonthlyReportService } from '../../service/monthly-report.service';

@Component({
  selector: 'app-monthly-reports',
  templateUrl: './monthly-reports.component.html',
  styleUrls: ['./monthly-reports.component.scss']
})
export class MonthlyReportsComponent implements OnInit {
  tree: any[] = [];
  loading = false;
  generating = false;

  constructor(private readonly monthlyReportService: MonthlyReportService) {}

  ngOnInit(): void {
    this.loadTree();
  }

  loadTree(): void {
    this.loading = true;
    this.monthlyReportService.getTree().subscribe({
      next: (data) => {
        this.tree = data ?? [];
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

  download(file: any): void {
    this.monthlyReportService.download(file.id).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.fileName || 'monthly-report.pdf';
      anchor.click();
      window.URL.revokeObjectURL(url);
    });
  }

  monthEntries(months: any): { key: string; value: any }[] {
    return Object.entries(months || {}).map(([key, value]) => ({ key, value }));
  }
}
