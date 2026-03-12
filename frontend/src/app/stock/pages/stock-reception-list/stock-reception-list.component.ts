import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { StockReceptionService } from '../../services/stock-reception.service';
import { StockReception } from '../../../core/models/stock-reception.model';

@Component({
  selector: 'app-stock-reception-list',
  templateUrl: './stock-reception-list.component.html',
  styleUrls: ['./stock-reception-list.component.scss']
})
export class StockReceptionListComponent implements OnInit {
  receptions: StockReception[] = [];
  totalElement = 0;
  pageSize = 10;
  currentPage = 0;
  searchReference = '';
  searchDate: string | null = null;

  constructor(
    private stockReceptionService: StockReceptionService,
    private router: Router,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit(): void {
    this.loadReceptions();
  }

  loadReceptions(): void {
    this.spinner.show();
    this.stockReceptionService.getReceptions(this.currentPage, this.pageSize, this.searchReference, this.searchDate).subscribe({
      next: (response) => {
        if (response && response.data.content) {
            this.receptions = response.data.content;
            this.totalElement = response.data.page.totalElements;
        } else {
             this.receptions = [];
             this.totalElement = 0;
        }
        this.spinner.hide();
      },
      error: () => {
        this.spinner.hide();
        this.receptions = [];
        this.totalElement = 0;
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadReceptions();
  }

  onSearchChange(): void {
    this.currentPage = 0;
    this.loadReceptions();
  }

  refresh(): void {
    this.searchReference = '';
    this.searchDate = null;
    this.currentPage = 0;
    this.loadReceptions();
  }

  viewDetails(id: number): void {
    this.router.navigate(['/stock/receptions', id]);
  }
}
