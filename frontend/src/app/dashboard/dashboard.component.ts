import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { ItemService } from '../article/service/item.service';
import { TokenStorageService } from '../shared/service/token-storage.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  // ── KPI values ───────────────────────────────────────────────
  totalClients    = 0;
  totalAccounts   = 0;
  totalLocalities = 0;
  totalArticles   = 0;

  // ── Stock tables ─────────────────────────────────────────────
  outOfStockArticles:         any[] = [];
  imminentOutOfStockArticles: any[] = [];

  currentPageOutOfStock = 0;
  currentPageImminent   = 0;
  pageSizeOutOfStock    = 5;
  pageSizeImminent      = 5;
  totalOutOfStockElement = 0;
  totalImminentElement   = 0;

  // ── UI state ─────────────────────────────────────────────────
  isLoading = true;
  today     = new Date();

  // ── Constructor ──────────────────────────────────────────────
  constructor(
    private itemsService: ItemService,
    private spinner: NgxSpinnerService,
    private tokenStorage: TokenStorageService,
    private router: Router
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit(): void {
    const token = this.tokenStorage.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadArticlesOutStock(this.currentPageOutOfStock, this.pageSizeOutOfStock);
    this.loadArticlesImminent(this.currentPageImminent, this.pageSizeImminent);
  }

  // ── Data loading ─────────────────────────────────────────────
  loadArticlesOutStock(page: number, pageSize: number): void {
    this.spinner.show();
    this.itemsService.outOfStock(page, pageSize).subscribe(
      data => {
        this.outOfStockArticles      = data.data.content;
        this.totalOutOfStockElement  = data.data.totalElements;
        this.isLoading = false;
      },
      error => {
        console.error('Error loading out-of-stock articles:', error);
        this.isLoading = false;
      }
    ).add(() => this.spinner.hide());
  }

  loadArticlesImminent(page: number, pageSize: number): void {
    this.spinner.show();
    this.itemsService.nextOutOfStock(page, pageSize).subscribe(
      data => {
        this.imminentOutOfStockArticles = data.data.content;
        this.totalImminentElement       = data.data.totalElements;
        this.isLoading = false;
      },
      error => {
        console.error('Error loading imminent out-of-stock articles:', error);
        this.isLoading = false;
      }
    ).add(() => this.spinner.hide());
  }

  // ── Pagination handlers ──────────────────────────────────────
  onOutOfStockPageChange(event: PageEvent): void {
    this.currentPageOutOfStock = event.pageIndex;
    this.pageSizeOutOfStock    = event.pageSize;
    this.loadArticlesOutStock(this.currentPageOutOfStock, this.pageSizeOutOfStock);
  }

  onImminentPageChange(event: PageEvent): void {
    this.currentPageImminent = event.pageIndex;
    this.pageSizeImminent    = event.pageSize;
    this.loadArticlesImminent(this.currentPageImminent, this.pageSizeImminent);
  }

  // ── Badge helpers ────────────────────────────────────────────

  /**
   * Returns the CSS class for the quantity badge.
   * Used in dashboard.component.html with [ngClass].
   */
  getQtyBadgeClass(stockQuantity: number): string {
    if (stockQuantity === 0)  return 'qty-zero';
    if (stockQuantity <= 5)   return 'qty-low';
    return 'qty-ok';
  }

  /**
   * Legacy method kept for backward compatibility with any
   * other templates that still reference getBadgeClass().
   */
  getBadgeClass(stockQuantity: number): string {
    if (stockQuantity === 0)  return 'badge-danger';
    if (stockQuantity <= 5)   return 'badge-warning';
    return 'badge-success';
  }
}
