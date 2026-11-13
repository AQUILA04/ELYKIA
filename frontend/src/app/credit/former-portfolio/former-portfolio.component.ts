import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { merge, Subscription } from 'rxjs';
import {
  FormerAgencyClient,
  FormerCreditDetail,
  FormerCreditItem,
  FormerPortfolioService,
  FormerTontineMember,
  FormerTontineMemberDetail,
  SpringPage
} from '../service/former-portfolio.service';

type Tab = 'tontine' | 'credit' | 'agence';

@Component({
  selector: 'app-former-portfolio',
  templateUrl: './former-portfolio.component.html',
  styleUrls: ['./former-portfolio.component.scss']
})
export class FormerPortfolioComponent implements OnInit, OnDestroy {
  currentDate = new Date();
  lastUpdate = new Date();
  tab: Tab = 'tontine';
  pageIndex = 0;
  pageSize = 20;
  loading = false;
  error: string | null = null;

  tontinePage: SpringPage<FormerTontineMember> | null = null;
  creditPage: SpringPage<FormerCreditItem> | null = null;
  agencyPage: SpringPage<FormerAgencyClient> | null = null;

  viewedCommercial: string | null = null;
  kind: string | null = null;
  detailId: number | null = null;
  tontineDetail: FormerTontineMemberDetail | null = null;
  creditDetail: FormerCreditDetail | null = null;
  agencyDetail: FormerAgencyClient | null = null;

  private clock?: ReturnType<typeof setInterval>;
  private routeSub?: Subscription;

  constructor(
    private readonly portfolio: FormerPortfolioService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.clock = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
    this.routeSub = merge(this.route.paramMap, this.route.queryParamMap).subscribe(() => {
      const params = this.route.snapshot.paramMap;
      this.kind = params.get('kind');
      const rawId = params.get('id');
      this.detailId = rawId ? Number(rawId) : null;
      this.viewedCommercial = this.route.snapshot.queryParamMap.get('commercial');
      const requested = this.route.snapshot.queryParamMap.get('tab');
      if (requested === 'tontine' || requested === 'credit' || requested === 'agence') {
        this.tab = requested;
      } else if (this.kind === 'tontine' || this.kind === 'credit' || this.kind === 'agence') {
        this.tab = this.kind;
      }
      this.pageIndex = 0;
      this.load();
    });
  }

  ngOnDestroy(): void {
    if (this.clock) {
      clearInterval(this.clock);
    }
    this.routeSub?.unsubscribe();
  }

  selectTab(tab: Tab): void {
    this.tab = tab;
    this.pageIndex = 0;
    void this.router.navigate(['/credit/ancien-portefeuille'], {
      queryParams: tab === 'tontine' ? this.tontineQueryParams : { tab },
      replaceUrl: !this.kind
    });
  }

  refresh(): void {
    this.load();
  }

  previousPage(): void {
    if (this.pageIndex === 0) {
      return;
    }
    this.pageIndex -= 1;
    this.load();
  }

  nextPage(): void {
    const total = this.activeTotalPages();
    if (this.pageIndex + 1 >= total) {
      return;
    }
    this.pageIndex += 1;
    this.load();
  }

  activeTotalPages(): number {
    if (this.tab === 'tontine') {
      return this.tontinePage?.totalPages ?? 0;
    }
    if (this.tab === 'credit') {
      return this.creditPage?.totalPages ?? 0;
    }
    return this.agencyPage?.totalPages ?? 0;
  }

  activeTotal(): number {
    if (this.tab === 'tontine') {
      return this.tontinePage?.totalElements ?? 0;
    }
    if (this.tab === 'credit') {
      return this.creditPage?.totalElements ?? 0;
    }
    return this.agencyPage?.totalElements ?? 0;
  }

  get tontineQueryParams(): { tab: string; commercial?: string } {
    return this.viewedCommercial
      ? { tab: 'tontine', commercial: this.viewedCommercial }
      : { tab: 'tontine' };
  }

  personName(firstname?: string | null, lastname?: string | null): string {
    return `${firstname ?? ''} ${lastname ?? ''}`.trim();
  }

  private load(): void {
    this.loading = true;
    this.error = null;
    this.tontineDetail = null;
    this.creditDetail = null;
    this.agencyDetail = null;
    if (this.kind && this.detailId) {
      this.loadDetail();
      return;
    }
    if (this.tab === 'tontine') {
      this.portfolio.listTontine(this.pageIndex, this.pageSize, this.viewedCommercial).subscribe({
        next: page => this.finishList(() => { this.tontinePage = page; }),
        error: () => this.fail()
      });
      return;
    }
    if (this.tab === 'credit') {
      this.portfolio.listCredits(this.pageIndex, this.pageSize).subscribe({
        next: page => this.finishList(() => { this.creditPage = page; }),
        error: () => this.fail()
      });
      return;
    }
    this.portfolio.listAgency(this.pageIndex, this.pageSize).subscribe({
      next: page => this.finishList(() => { this.agencyPage = page; }),
      error: () => this.fail()
    });
  }

  private loadDetail(): void {
    if (this.kind === 'tontine' && this.detailId) {
      this.portfolio.tontineMember(this.detailId, this.viewedCommercial).subscribe({
        next: detail => this.finishList(() => { this.tontineDetail = detail; }),
        error: () => this.fail()
      });
      return;
    }
    if (this.kind === 'credit' && this.detailId) {
      this.portfolio.credit(this.detailId).subscribe({
        next: detail => this.finishList(() => { this.creditDetail = detail; }),
        error: () => this.fail()
      });
      return;
    }
    if (this.kind === 'agence' && this.detailId) {
      this.portfolio.agencyClient(this.detailId).subscribe({
        next: detail => this.finishList(() => { this.agencyDetail = detail; }),
        error: () => this.fail()
      });
      return;
    }
    this.fail();
  }

  private finishList(apply: () => void): void {
    apply();
    this.loading = false;
    this.lastUpdate = new Date();
  }

  private fail(): void {
    this.loading = false;
    this.error = 'Impossible de charger cet ancien portefeuille.';
  }
}
