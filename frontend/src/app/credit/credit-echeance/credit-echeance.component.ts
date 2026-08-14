import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CreditEcheanceService } from '../service/credit-echeance.service';
import { AuthService } from 'src/app/auth/service/auth.service';
import { KpiFinancierPermissions } from 'src/app/shared/constants/kpi-financier-permission.constant';
import {
  CreditEcheanceDTO,
  CreditEcheanceSummaryDTO
} from '../models/credit-echeance.model';

@Component({
  selector: 'app-credit-echeance',
  templateUrl: './credit-echeance.component.html',
  styleUrls: ['./credit-echeance.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class CreditEcheanceComponent implements OnInit {

  summary: CreditEcheanceSummaryDTO = {
    totalToday: 0,
    totalWeek: 0,
    totalUnsettled: 0,
    totalAmountRemaining: 0
  };

  allCredits: CreditEcheanceDTO[] = [];
  filteredCredits: CreditEcheanceDTO[] = [];
  isLoading: boolean = false;

  selectedPeriod: string = 'week';
  selectedDate: string = '';
  selectedCollector: string = '';

  currentDate: Date = new Date();
  lastUpdate: Date = new Date();

  constructor(
    private echeanceService: CreditEcheanceService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadData();
    setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  loadData() {
    this.isLoading = true;

    void this.authService.hasPermission(KpiFinancierPermissions.Echeance).then((allowed) => {
      if (!allowed) {
        return;
      }
      this.echeanceService.getSummary(this.selectedCollector).subscribe({
        next: (res: any) => {
          if (res.statusCode === 200 && res.data) {
            this.summary = res.data;
            this.lastUpdate = new Date();
          }
        },
        error: (err: any) => console.error(err)
      });
    });

    // Load credits based on selected period
    this.fetchCreditsForPeriod();
  }

  private fetchCreditsForPeriod() {
    let request$;

    if (this.selectedPeriod === 'today') {
      request$ = this.echeanceService.getForToday(this.selectedCollector);
    } else if (this.selectedPeriod === 'custom' && this.selectedDate) {
      request$ = this.echeanceService.getForDate(this.selectedDate, this.selectedCollector);
    } else {
      request$ = this.echeanceService.getForWeek(this.selectedCollector);
    }

    request$.subscribe({
      next: (res: any) => {
        if (res.statusCode === 200 && res.data) {
          this.allCredits = res.data;
          this.filteredCredits = [...this.allCredits];
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

  onDaySelected(dateStr: string) {
    this.selectedDate = dateStr;
    this.selectedPeriod = 'custom';
    this.isLoading = true;
    this.fetchCreditsForPeriod();
  }

  onPeriodChanged(period: string) {
    this.selectedPeriod = period;
    if (period !== 'custom') {
      this.selectedDate = '';
    }
    this.isLoading = true;
    this.fetchCreditsForPeriod();
  }

  onDateChanged(date: string) {
    this.selectedDate = date;
    this.selectedPeriod = 'custom';
    this.isLoading = true;
    this.fetchCreditsForPeriod();
  }

  onCommercialChanged(collector: string | null) {
    this.selectedCollector = collector ?? '';
    this.loadData();
  }
}
