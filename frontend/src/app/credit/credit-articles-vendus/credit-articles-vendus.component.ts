import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { CreditService } from '../service/credit.service';
import { ClientService } from '../../client/service/client.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import * as moment from 'moment';

@Component({
  selector: 'app-credit-articles-vendus',
  templateUrl: './credit-articles-vendus.component.html',
  styleUrls: ['./credit-articles-vendus.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class CreditArticlesVendusComponent implements OnInit, OnDestroy {
  currentDate = new Date();
  lastUpdate = new Date();
  private dateIntervalId?: ReturnType<typeof setInterval>;
  
  articles: any[] = [];
  collectors: any[] = [];
  selectedCommercial: string | null = null;
  
  periodPreset: 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM' = 'WEEK';
  startDate: string = '';
  endDate: string = '';
  
  isLoading = false;
  isDownloading = false;
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;

  private readonly STATE_KEY = 'creditArticlesVendusState';

  constructor(
    private creditService: CreditService,
    private clientService: ClientService,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    this.restoreState();
    this.loadCollectors();
    this.loadArticles();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy() {
    this.saveState();
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  private saveState() {
    const state = {
      periodPreset: this.periodPreset,
      startDate: this.startDate,
      endDate: this.endDate,
      selectedCommercial: this.selectedCommercial,
      currentPage: this.currentPage,
      pageSize: this.pageSize
    };
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  private restoreState() {
    const saved = sessionStorage.getItem(this.STATE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.periodPreset = state.periodPreset || 'WEEK';
        this.startDate = state.startDate || '';
        this.endDate = state.endDate || '';
        this.selectedCommercial = state.selectedCommercial || null;
        this.currentPage = state.currentPage || 0;
        this.pageSize = state.pageSize || 10;
      } catch (e) {
        console.error('Erreur restauration state', e);
        this.initDates();
      }
    } else {
      this.initDates();
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
        this.lastUpdate = new Date();
        if (res && res.statusCode === 200 && res.data) {
          this.articles = res.data.content || [];
          this.totalElements = res.data.page?.totalElements ?? res.data.totalElements ?? 0;
        } else {
          this.articles = [];
          this.totalElements = 0;
        }
        this.saveState();
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
    }
    this.loadArticles();
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

  onDownloadClicked() {
    if (this.startDate && this.endDate) {
      const start = moment(this.startDate);
      const end = moment(this.endDate);
      
      if (end.diff(start, 'months', true) > 1) {
        this.alertService.showError('La plage de dates ne doit pas dépasser un mois pour l\'export PDF.');
        return;
      }
    }

    this.isDownloading = true;
    const searchDto = {
      startDate: this.startDate || null,
      endDate: this.endDate || null,
      commercial: this.selectedCommercial || null
    };

    this.creditService.exportSoldArticlesPdf(searchDto).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `articles_vendus_${new Date().getTime()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isDownloading = false;
      },
      error: (err) => {
        console.error('Erreur lors du téléchargement du PDF', err);
        this.alertService.showError('Erreur lors du téléchargement du PDF');
        this.isDownloading = false;
      }
    });
  }
}
