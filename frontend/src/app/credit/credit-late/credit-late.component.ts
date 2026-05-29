import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CreditLateService } from '../service/credit-late.service';
import { CreditLateDTO, CreditLateSummaryDTO } from '../models/credit-late.model';

@Component({
  selector: 'app-credit-late',
  templateUrl: './credit-late.component.html',
  styleUrls: ['./credit-late.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class CreditLateComponent implements OnInit {
  summary: CreditLateSummaryDTO = { totalLate: 0, totalDelai: 0, totalEcheance: 0, totalAmountRemaining: 0 };
  allCredits: CreditLateDTO[] = [];
  filteredCredits: CreditLateDTO[] = [];
  isLoading: boolean = false;
  
  currentCollector: string = '';
  currentType: string = 'all';
  currentMonth: number | null = null;
  currentLocality: string = 'all';
  savedPage: number = 1;

  currentDate: Date = new Date();
  lastUpdate: Date = new Date();
  
  isDownloading: boolean = false;
  
  constructor(private creditLateService: CreditLateService) {}

  ngOnInit() {
    this.restoreState();
    this.loadData();
    setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  loadData() {
    this.isLoading = true;
    
    // Load summary
    this.creditLateService.getSummary(this.currentCollector, this.currentMonth || undefined, this.currentLocality).subscribe({
      next: (res: any) => {
        if (res.statusCode === 200 && res.data) {
          this.summary = res.data;
          this.lastUpdate = new Date();
        }
      },
      error: (err) => console.error(err)
    });

    // Load credits
    this.creditLateService.getLateCredits(this.currentCollector, this.currentMonth || undefined, this.currentLocality).subscribe({
      next: (res: any) => {
        if (res.statusCode === 200 && res.data) {
          this.allCredits = res.data;
          this.applyFilters();
          this.lastUpdate = new Date();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  onCommercialChanged(collector: string) {
    this.currentCollector = collector;
    this.savedPage = 1;
    this.saveState();
    this.loadData();
  }

  onTypeChanged(type: string) {
    this.currentType = type;
    this.savedPage = 1;
    this.saveState();
    this.applyFilters();
  }

  onLocalityChanged(locality: string) {
    this.currentLocality = locality;
    this.savedPage = 1;
    this.saveState();
    this.loadData();
  }

  applyFilters() {
    if (this.currentType === 'all') {
      this.filteredCredits = [...this.allCredits];
    } else {
      this.filteredCredits = this.allCredits.filter(c => c.lateType === this.currentType);
    }
  }

  onMonthChanged(month: number | null) {
    this.currentMonth = month;
    this.savedPage = 1;
    this.saveState();
    this.loadData();
  }

  onPageChanged(page: number) {
    this.savedPage = page;
    this.saveState();
  }

  private saveState() {
    const state = {
      collector: this.currentCollector,
      type: this.currentType,
      month: this.currentMonth,
      locality: this.currentLocality,
      page: this.savedPage
    };
    sessionStorage.setItem('creditLateFilters', JSON.stringify(state));
  }

  private restoreState() {
    const saved = sessionStorage.getItem('creditLateFilters');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.currentCollector = state.collector || '';
        this.currentType = state.type || 'all';
        this.currentMonth = state.month || null;
        this.currentLocality = state.locality || 'all';
        this.savedPage = state.page || 1;
      } catch (e) {
        console.error('Erreur restauration state', e);
      }
    }
  }

  onDownloadClicked() {
    this.isDownloading = true;
    this.creditLateService.exportPdf(this.currentCollector, this.currentMonth || undefined, this.currentType, this.currentLocality).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `credits_en_retard_${new Date().getTime()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isDownloading = false;
      },
      error: (err) => {
        console.error('Erreur lors du téléchargement du PDF', err);
        this.isDownloading = false;
      }
    });
  }
}
