import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ItemService } from 'src/app/article/service/item.service';

@Component({
  selector: 'app-dashboard-stockkeeper-alerts',
  templateUrl: './dashboard-stockkeeper-alerts.component.html',
  styleUrls: ['./dashboard-stockkeeper-alerts.component.scss']
})
export class DashboardStockkeeperAlertsComponent implements OnInit {
  outOfStockArticles: any[] = [];
  imminentOutOfStockArticles: any[] = [];
  currentPageOutOfStock = 0;
  currentPageImminent = 0;
  pageSizeOutOfStock = 5;
  pageSizeImminent = 5;
  totalOutOfStockElement = 0;
  totalImminentElement = 0;
  loadingOutOfStock = true;
  loadingImminent = true;

  constructor(private itemsService: ItemService) {}

  ngOnInit(): void {
    this.loadArticlesOutStock(this.currentPageOutOfStock, this.pageSizeOutOfStock);
    this.loadArticlesImminent(this.currentPageImminent, this.pageSizeImminent);
  }

  loadArticlesOutStock(page: number, pageSize: number): void {
    this.loadingOutOfStock = true;
    this.itemsService.outOfStock(page, pageSize).subscribe({
      next: (data) => {
        this.outOfStockArticles = data.data.content;
        this.totalOutOfStockElement = data.data.totalElements;
        this.loadingOutOfStock = false;
      },
      error: () => { this.loadingOutOfStock = false; }
    });
  }

  loadArticlesImminent(page: number, pageSize: number): void {
    this.loadingImminent = true;
    this.itemsService.nextOutOfStock(page, pageSize).subscribe({
      next: (data) => {
        this.imminentOutOfStockArticles = data.data.content;
        this.totalImminentElement = data.data.totalElements;
        this.loadingImminent = false;
      },
      error: () => { this.loadingImminent = false; }
    });
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
    if (stockQuantity === 0) return 'qty-danger';
    if (stockQuantity <= 5) return 'qty-warning';
    return 'qty-success';
  }
}
