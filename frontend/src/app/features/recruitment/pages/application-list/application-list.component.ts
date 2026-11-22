import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { RecruitmentService } from '../../services/recruitment.service';
import { JobApplication, JobOffer } from '../../models/recruitment.model';

@Component({
  selector: 'app-application-list',
  templateUrl: './application-list.component.html',
  styleUrls: ['./application-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false,
})
export class ApplicationListComponent implements OnInit, OnDestroy {
  applications: JobApplication[] = [];
  offers: JobOffer[] = [];
  selectedOfferId: number | null = null;
  isLoading = false;
  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;
  currentDate = new Date();
  lastUpdate = new Date();
  private clockInterval?: ReturnType<typeof setInterval>;

  constructor(
    private recruitmentService: RecruitmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.recruitmentService.listOffers(0, 100).subscribe((page) => {
      this.offers = page.content || [];
    });
    this.loadApplications();
    this.clockInterval = setInterval(() => { this.currentDate = new Date(); }, 1000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  refresh(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.isLoading = true;
    this.recruitmentService
      .listApplications(this.pageIndex, this.pageSize, this.selectedOfferId ?? undefined)
      .subscribe({
        next: (page) => {
          this.applications = page.content || [];
          this.totalElements = page.totalElements ?? 0;
          this.lastUpdate = new Date();
          this.isLoading = false;
        },
        error: () => { this.isLoading = false; },
      });
  }

  onOfferFilter(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedOfferId = val ? Number(val) : null;
    this.pageIndex = 0;
    this.loadApplications();
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadApplications();
  }

  viewDetail(app: JobApplication): void {
    this.router.navigate(['/recruitment/applications', app.id]);
  }
}
