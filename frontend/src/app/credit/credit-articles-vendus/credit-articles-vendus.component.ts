import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { CreditService } from '../service/credit.service';
import { ClientService } from '../../client/service/client.service';
import * as moment from 'moment';

@Component({
  selector: 'app-credit-articles-vendus',
  templateUrl: './credit-articles-vendus.component.html',
  styleUrls: ['./credit-articles-vendus.component.scss'],
  standalone: false
})
export class CreditArticlesVendusComponent implements OnInit {
  currentDate = new Date();
  private dateIntervalId?: ReturnType<typeof setInterval>;
  
  articles: any[] = [];
  collectors: any[] = [];
  selectedCommercial: string | null = null;
  
  periodPreset: 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM' = 'WEEK';
  startDate: string = '';
  endDate: string = '';
  
  isLoading = false;
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;

  constructor(
    private creditService: CreditService,
    private clientService: ClientService
  ) {}

  ngOnInit() {
    this.initDates();
    this.loadCollectors();
    this.loadArticles();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  initDates() {
    switch (this.periodPreset) {
      case 'TODAY':
        this.startDate = moment().format('YYYY-MM-DD');
        this.endDate = moment().format('YYYY-MM-DD');
        break;
      case 'WEEK':
        this.startDate = moment().startOf('isoWeek').format('YYYY-MM-DD');
        this.endDate = moment().endOf('isoWeek').format('YYYY-MM-DD');
        break;
      case 'MONTH':
        this.startDate = moment().startOf('month').format('YYYY-MM-DD');
        this.endDate = moment().endOf('month').format('YYYY-MM-DD');
        break;
      default:
        break;
    }
  }

  loadCollectors() {
    this.clientService.getAgents().subscribe({
      next: (data: any) => {
        this.collectors = data;
      },
      error: () => {
        this.collectors = [];
      }
    });
  }

  loadArticles() {
    this.isLoading = true;
    const searchDto = {
      startDate: this.startDate || null,
      endDate: this.endDate || null,
      commercial: this.selectedCommercial || null
    };

    this.creditService.searchSoldArticles(searchDto, this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.statusCode === 200 && res.data) {
          this.articles = res.data.content || [];
          this.totalElements = res.data.totalElements || 0;
        } else {
          this.articles = [];
          this.totalElements = 0;
        }
      },
      error: () => {
        this.isLoading = false;
        this.articles = [];
        this.totalElements = 0;
      }
    });
  }

  onPeriodPresetChange(preset: 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM') {
    this.periodPreset = preset;
    this.currentPage = 0;
    if (preset !== 'CUSTOM') {
      this.initDates();
      this.loadArticles();
    }
  }

  onCustomPeriodChange() {
    if (this.startDate && this.endDate) {
      this.periodPreset = 'CUSTOM';
      this.currentPage = 0;
      this.loadArticles();
    }
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadArticles();
  }
}
