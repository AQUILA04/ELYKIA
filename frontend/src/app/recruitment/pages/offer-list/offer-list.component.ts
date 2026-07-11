import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RecruitmentService } from '../../services/recruitment.service';
import { JobOffer } from '../../models/recruitment.model';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-offer-list',
  templateUrl: './offer-list.component.html',
  styleUrls: ['./offer-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false,
})
export class OfferListComponent implements OnInit, OnDestroy {
  offers: JobOffer[] = [];
  isLoading = false;
  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;
  publishedCount = 0;
  draftCount = 0;
  withdrawnCount = 0;
  currentDate = new Date();
  lastUpdate = new Date();
  private clockInterval?: ReturnType<typeof setInterval>;

  constructor(
    private recruitmentService: RecruitmentService,
    private router: Router,
    private snackBar: MatSnackBar,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadOffers();
    this.clockInterval = setInterval(() => { this.currentDate = new Date(); }, 1000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  refresh(): void {
    this.loadOffers();
  }

  loadOffers(): void {
    this.isLoading = true;
    this.recruitmentService.listOffers(this.pageIndex, this.pageSize).subscribe({
      next: (page) => {
        this.offers = page.content || [];
        this.totalElements = page.totalElements ?? 0;
        this.updateStatusCounts();
        this.lastUpdate = new Date();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  private updateStatusCounts(): void {
    this.recruitmentService.listOffers(0, 500).subscribe({
      next: (page) => {
        const all = page.content || [];
        this.publishedCount = all.filter((o) => o.status === 'PUBLISHED').length;
        this.draftCount = all.filter((o) => o.status === 'DRAFT').length;
        this.withdrawnCount = all.filter((o) => o.status === 'WITHDRAWN').length;
      },
    });
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadOffers();
  }

  addOffer(): void {
    this.router.navigate(['/recruitment/offers/add']);
  }

  editOffer(offer: JobOffer): void {
    this.router.navigate(['/recruitment/offers/edit', offer.id]);
  }

  publishOffer(offer: JobOffer): void {
    this.recruitmentService.publishOffer(offer.id!).subscribe({
      next: () => {
        this.snackBar.open('Offre publiée', 'Fermer', { duration: 3000 });
        this.loadOffers();
      },
    });
  }

  withdrawOffer(offer: JobOffer): void {
    this.recruitmentService.withdrawOffer(offer.id!).subscribe({
      next: () => {
        this.snackBar.open('Offre retirée', 'Fermer', { duration: 3000 });
        this.loadOffers();
      },
    });
  }

  deleteOffer(offer: JobOffer): void {
    this.alertService.showConfirmation('Confirmation', `Supprimer l'offre « ${offer.title} » ?`).then((ok) => {
      if (ok) {
        this.recruitmentService.deleteOffer(offer.id!).subscribe({
          next: () => {
            this.snackBar.open('Offre supprimée', 'Fermer', { duration: 3000 });
            this.loadOffers();
          },
        });
      }
    });
  }

  statusLabel(status?: string): string {
    switch (status) {
      case 'PUBLISHED': return 'Publiée';
      case 'WITHDRAWN': return 'Retirée';
      default: return 'Brouillon';
    }
  }
}
