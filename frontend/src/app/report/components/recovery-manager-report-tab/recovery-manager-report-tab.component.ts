import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { RecoveryManagerService } from '../../../credit/service/recovery-manager.service';
import { RecoveryManagerReportSummaryDto, RecoveryManagerOperation } from '../../../credit/models/recovery-manager.model';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';

@Component({
  selector: 'app-recovery-manager-report-tab',
  templateUrl: './recovery-manager-report-tab.component.html',
  styleUrls: ['./recovery-manager-report-tab.component.scss'],
  standalone: false
})
export class RecoveryManagerReportTabComponent implements OnInit, OnChanges {
  @Input() startDate: string = '';
  @Input() endDate: string = '';
  @Input() commercialUsername: string | null = null;

  summary: RecoveryManagerReportSummaryDto | null = null;
  operations: RecoveryManagerOperation[] = [];
  isLoading = false;
  isDownloading = false;
  isManager = false;
  recoveryManagerUsername: string | null = null;
  recoveryManagers: any[] = [];
  showNoData = false;

  // Pagination for operations
  currentPage = 0;
  pageSize = 20;
  totalElements = 0;

  constructor(
    private recoveryManagerService: RecoveryManagerService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE) || this.userService.hasProfile(UserProfile.ADMIN);
    if (!this.isManager) {
      this.recoveryManagerUsername = this.userService.getUsername();
    }
    if (this.startDate && this.endDate) {
      this.loadData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['startDate'] || changes['endDate'] || changes['commercialUsername']) && this.startDate && this.endDate) {
      this.currentPage = 0;
      this.loadData();
    }
  }

  loadData(): void {
    this.isLoading = true;
    this.showNoData = false;

    this.recoveryManagerService.getReportSummary({
      startDate: this.startDate,
      endDate: this.endDate,
      recoveryManagerUsername: this.recoveryManagerUsername || undefined,
      commercialUsername: this.commercialUsername || undefined
    }).subscribe({
      next: (res: any) => {
        if (res.statusCode === 200 && res.data) {
          this.summary = res.data;
          this.showNoData = !res.data.totalOperationsCount;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading recovery report summary', err);
        this.isLoading = false;
      }
    });

    this.loadOperations();
  }

  loadOperations(): void {
    this.recoveryManagerService.getOperations({
      startDate: this.startDate,
      endDate: this.endDate,
      recoveryManagerUsername: this.recoveryManagerUsername || undefined,
      commercialUsername: this.commercialUsername || undefined,
      page: this.currentPage,
      size: this.pageSize
    }).subscribe({
      next: (res: any) => {
        if (res.statusCode === 200 && res.data) {
          this.operations = res.data.content || [];
          this.totalElements = res.data.page.totalElements || 0;
        }
      },
      error: (err) => console.error('Error loading recovery operations', err)
    });
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex || 0;
    this.pageSize = event.pageSize || 20;
    this.loadOperations();
  }

  onRecoveryManagerChange(username: string): void {
    this.recoveryManagerUsername = username || null;
    this.loadData();
  }

  onExportPdf(): void {
    if (this.isDownloading) return;
    this.isDownloading = true;

    this.recoveryManagerService.downloadReportPdf({
      startDate: this.startDate,
      endDate: this.endDate,
      recoveryManagerUsername: this.recoveryManagerUsername || undefined,
      commercialUsername: this.commercialUsername || undefined
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport_recouvrement_terrain_${this.startDate}_${this.endDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isDownloading = false;
      },
      error: (err) => {
        console.error('Error downloading PDF', err);
        this.isDownloading = false;
      }
    });
  }
}
