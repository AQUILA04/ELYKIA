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

  currentDate: Date = new Date();
  lastUpdate: Date = new Date();

  constructor(private creditLateService: CreditLateService) {}

  ngOnInit() {
    this.loadData();
    setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  loadData() {
    this.isLoading = true;
    
    // Load summary
    this.creditLateService.getSummary(this.currentCollector).subscribe({
      next: (res: any) => {
        if (res.statusCode === 200 && res.data) {
          this.summary = res.data;
          this.lastUpdate = new Date();
        }
      },
      error: (err) => console.error(err)
    });

    // Load credits
    this.creditLateService.getLateCredits(this.currentCollector).subscribe({
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
    this.loadData();
  }

  onTypeChanged(type: string) {
    this.currentType = type;
    this.applyFilters();
  }

  applyFilters() {
    if (this.currentType === 'all') {
      this.filteredCredits = [...this.allCredits];
    } else {
      this.filteredCredits = this.allCredits.filter(c => c.lateType === this.currentType);
    }
  }
}
