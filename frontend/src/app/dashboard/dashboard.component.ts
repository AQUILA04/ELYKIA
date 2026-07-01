import { Component, OnDestroy, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ItemService } from '../article/service/item.service';
import { TokenStorageService } from '../shared/service/token-storage.service';
import { FeatureFlagService, FeatureFlags } from '../shared/service/feature-flag.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  dashboardV2Enabled = false;

  totalClients: number = 0;
  totalAccounts: number = 0;
  totalLocalities: number = 0;
  totalArticles: number = 0;
  outOfStockArticles: any[] = [];
  imminentOutOfStockArticles: any[] = [];
  currentPageOutOfStock: number = 0;
  currentPageImminent: number = 0;
  pageSizeOutOfStock: number = 5;
  pageSizeImminent: number = 5;
  totalOutOfStockElement: number = 0;
  totalImminentElement: number = 0;
  isLoading: boolean = true;

  private flagSub?: Subscription;

  constructor(
    private itemsService: ItemService,
    private spinner: NgxSpinnerService,
    private tokenStorage: TokenStorageService,
    private router: Router,
    private featureFlagService: FeatureFlagService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.dashboardV2Enabled = this.featureFlagService.isFeatureEnabled(FeatureFlags.DashboardV2);
    this.flagSub = this.featureFlagService.flags$.subscribe(flags => {
      this.dashboardV2Enabled = flags[FeatureFlags.DashboardV2] ?? false;
    });

    const token = this.tokenStorage.getToken();
    if (token == null) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.dashboardV2Enabled) {
      this.loadArticlesOutStock(this.currentPageOutOfStock, this.pageSizeOutOfStock);
      this.loadArticlesImminent(this.currentPageImminent, this.pageSizeImminent);
    }
  }

  ngOnDestroy(): void {
    this.flagSub?.unsubscribe();
  }

  loadArticlesOutStock(page: number, pageSize: number): void {
    this.spinner.show();
    this.itemsService.outOfStock(page, pageSize).subscribe(
      data => {
        this.outOfStockArticles = data.data.content;
        this.totalOutOfStockElement = data.data.totalElements;
        this.isLoading = false;
      },
      error => {
        console.error('Error loading out of stock articles', error);
        this.isLoading = false;
      }
    ).add(() => this.spinner.hide());
  }

  loadArticlesImminent(page: number, pageSize: number): void {
    this.spinner.show();
    this.itemsService.nextOutOfStock(page, pageSize).subscribe(
      data => {
        this.imminentOutOfStockArticles = data.data.content;
        this.totalImminentElement = data.data.totalElements;
        this.isLoading = false;
      },
      error => {
        console.error('Error loading imminent out of stock articles', error);
        this.isLoading = false;
      }
    ).add(() => this.spinner.hide());
  }

  onOutOfStockPageChange(event: PageEvent): void {
    this.currentPageOutOfStock = event.pageIndex;
    this.pageSizeOutOfStock = event.pageSize;
    this.loadArticlesOutStock(this.currentPageOutOfStock, this.pageSizeOutOfStock);
  }

  onImminentPageChange(event: PageEvent): void {
    this.currentPageImminent = event.pageIndex;
    this.pageSizeImminent = event.pageSize;
    this.loadArticlesImminent(this.currentPageImminent, this.pageSizeImminent);
  }

  getBadgeClass(stockQuantity: number): string {
    if (stockQuantity === 0) {
      return 'badge-danger';
    } else if (stockQuantity <= 5) {
      return 'badge-warning';
    } else {
      return 'badge-success';
    }
  }
}
