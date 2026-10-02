import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AlertService } from 'src/app/shared/service/alert.service';
import {
  CustomerMobileMoneySubmission,
  CustomerMobileMoneySubmissionService
} from '../../services/customer-mobile-money-submission.service';
import {
  CustomerTontineMmSubmission,
  CustomerTontineMmSubmissionService
} from '../../services/customer-tontine-mm-submission.service';

type PaymentTab = 'credit' | 'tontine';

@Component({
  selector: 'app-customer-payments-list',
  templateUrl: './customer-payments-list.component.html',
  styleUrls: ['./customer-payments-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class CustomerPaymentsListComponent implements OnInit, OnDestroy {
  tab: PaymentTab = 'credit';
  submissions: CustomerMobileMoneySubmission[] = [];
  tontineSubmissions: CustomerTontineMmSubmission[] = [];
  loading = false;
  highlightId: number | null = null;
  
  currentDate = new Date();
  lastUpdate = new Date();
  private dateIntervalId?: ReturnType<typeof setInterval>;

  proofPreviewUrl: string | null = null;
  proofPreviewSafeUrl: SafeResourceUrl | null = null;
  proofPreviewIsPdf = false;
  proofPreviewTitle = 'Justificatif';
  proofLoading = false;

  constructor(
    private creditService: CustomerMobileMoneySubmissionService,
    private tontineService: CustomerTontineMmSubmissionService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    this.tab = tabParam === 'tontine' ? 'tontine' : 'credit';
    const idParam = this.route.snapshot.queryParamMap.get('id');
    this.highlightId = idParam ? Number(idParam) : null;
    
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
    
    this.load();
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
    this.closeProofPreview();
  }

  setTab(tab: PaymentTab): void {
    this.tab = tab;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab, id: this.highlightId || null },
      queryParamsHandling: 'merge'
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    if (this.tab === 'tontine') {
      this.tontineService.list('INITIE').subscribe({
        next: (rows) => {
          this.tontineSubmissions = rows;
          this.loading = false;
          this.lastUpdate = new Date();
        },
        error: () => {
          this.loading = false;
          this.alertService.toastError('Impossible de charger les déclarations tontine.');
        }
      });
      return;
    }
    this.creditService.list('INITIE').subscribe({
      next: (rows) => {
        this.submissions = rows;
        this.loading = false;
        this.lastUpdate = new Date();
      },
      error: () => {
        this.loading = false;
        this.alertService.toastError('Impossible de charger les déclarations.');
      }
    });
  }

  openProofCredit(row: CustomerMobileMoneySubmission): void {
    if (!row.hasProof) {
      return;
    }
    this.openProofBlob(
      this.creditService.downloadProof(row.id),
      row.proofContentType,
      `Justificatif — ${row.clientName || row.clientId}`,
    );
  }

  openProofTontine(row: CustomerTontineMmSubmission): void {
    if (!row.hasProof) {
      return;
    }
    this.openProofBlob(
      this.tontineService.downloadProof(row.id),
      row.proofContentType,
      `Justificatif — ${row.clientName || row.clientId}`,
    );
  }

  closeProofPreview(): void {
    if (this.proofPreviewUrl) {
      URL.revokeObjectURL(this.proofPreviewUrl);
    }
    this.proofPreviewUrl = null;
    this.proofPreviewSafeUrl = null;
    this.proofPreviewIsPdf = false;
  }

  private openProofBlob(
    source: Observable<Blob>,
    contentType: string | undefined,
    title: string,
  ): void {
    this.proofLoading = true;
    source.subscribe({
      next: (blob) => {
        this.closeProofPreview();
        const type = contentType || blob.type || '';
        this.proofPreviewIsPdf = type.includes('pdf');
        this.proofPreviewUrl = URL.createObjectURL(blob);
        // blob: from authenticated API stream — required for iframe[src] PDF preview
        this.proofPreviewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.proofPreviewUrl); // NOSONAR
        this.proofPreviewTitle = title;
        this.proofLoading = false;
      },
      error: () => {
        this.proofLoading = false;
        this.alertService.toastError('Impossible d\'ouvrir le justificatif.');
      },
    });
  }

  validate(row: CustomerMobileMoneySubmission): void {
    this.creditService.validate(row.id).subscribe({
      next: () => {
        this.alertService.toastSuccess('Déclaration validée.');
        this.load();
      },
      error: (err) => {
        this.alertService.toastError(err?.error?.message || 'Validation impossible.');
      }
    });
  }

  reject(row: CustomerMobileMoneySubmission): void {
    this.alertService.showConfirmation(
      'Rejeter la déclaration',
      'Confirmer le rejet de cette déclaration de paiement ?',
      'Rejeter',
      'Annuler'
    ).then((ok) => {
      if (!ok) {
        return;
      }
      this.creditService.reject(row.id).subscribe({
        next: () => {
          this.alertService.toastSuccess('Déclaration rejetée.');
          this.load();
        },
        error: (err) => {
          this.alertService.toastError(err?.error?.message || 'Rejet impossible.');
        }
      });
    });
  }

  validateTontine(row: CustomerTontineMmSubmission): void {
    this.tontineService.validate(row.id).subscribe({
      next: () => {
        this.alertService.toastSuccess('Cotisation tontine validée.');
        this.load();
      },
      error: (err) => {
        this.alertService.toastError(err?.error?.message || 'Validation impossible.');
      }
    });
  }

  rejectTontine(row: CustomerTontineMmSubmission): void {
    this.alertService.showConfirmation(
      'Rejeter la déclaration tontine',
      'Confirmer le rejet de cette cotisation ?',
      'Rejeter',
      'Annuler'
    ).then((ok) => {
      if (!ok) {
        return;
      }
      this.tontineService.reject(row.id).subscribe({
        next: () => {
          this.alertService.toastSuccess('Déclaration tontine rejetée.');
          this.load();
        },
        error: (err) => {
          this.alertService.toastError(err?.error?.message || 'Rejet impossible.');
        }
      });
    });
  }

  openCredit(row: CustomerMobileMoneySubmission): void {
    void this.router.navigate(['/credit/details', row.creditId]);
  }
}
