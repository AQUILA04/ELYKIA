import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { RecouvrementService } from '../service/recouvrement.service';
import { CreditService } from '../service/credit.service';
import { RecouvrementWebDto, RecouvrementKpiDto } from '../models/recouvrement.model';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { AlertService } from 'src/app/shared/service/alert.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-recouvrement',
  templateUrl: './recouvrement.component.html',
  styleUrls: ['./recouvrement.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class RecouvrementComponent implements OnInit {
  summary: RecouvrementKpiDto = { totalMises: 0, totalMontant: 0 };
  recouvrements: RecouvrementWebDto[] = [];
  isLoading: boolean = false;

  currentCollector: string = 'all';
  dateFrom: string = '';
  dateTo: string = '';

  currentDate: Date = new Date();
  lastUpdate: Date = new Date();

  isCommercialLogue: boolean = false;

  constructor(
    private recouvrementService: RecouvrementService,
    private creditService: CreditService,
    private tokenStorage: TokenStorageService,
    private userService: UserService,
    private alertService: AlertService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit() {
    this.initDefaultFilters();
    this.checkIfCommercial();
    this.loadData();
    setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  initDefaultFilters() {
    const today = new Date().toISOString().split('T')[0];
    this.dateFrom = today;
    this.dateTo = today;
  }

  checkIfCommercial() {
    const isCommercial = this.userService.hasProfile(UserProfile.PROMOTER);
    if (isCommercial) {
      this.isCommercialLogue = true;
      this.currentCollector = this.tokenStorage.getUser()?.username || 'all';
    }
  }

  loadData() {
    this.isLoading = true;

    this.recouvrementService.getSummary(this.dateFrom, this.dateTo, this.currentCollector).subscribe({
      next: (res: any) => {
        if (res.statusCode === 200 && res.data) {
          this.summary = res.data;
          this.lastUpdate = new Date();
        }
      },
      error: (err: any) => console.error(err)
    });

    this.recouvrementService.getRecouvrements(this.dateFrom, this.dateTo, this.currentCollector).subscribe({
      next: (res: any) => {
        if (res.statusCode === 200 && res.data) {
          this.recouvrements = res.data.content || res.data;
          this.lastUpdate = new Date();
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  onCommercialChanged(collector: string) {
    if (!this.isCommercialLogue) {
      this.currentCollector = collector;
      this.loadData();
    }
  }

  onPeriodDateChanged(dates: { from: string, to: string }) {
    this.dateFrom = dates.from;
    this.dateTo = dates.to;
    this.loadData();
  }

  async onCancelRecovery(row: RecouvrementWebDto): Promise<void> {
    if (!row?.id) return;

    const confirmed = await this.alertService.showConfirmation(
      'Annulation de recouvrement',
      `Êtes-vous sûr de vouloir annuler le recouvrement ${row.reference || ''} ? Les montants du crédit et du rapport journalier seront corrigés.`,
      'Oui, annuler',
      'Non'
    );
    if (!confirmed) return;

    this.spinner.show();
    this.creditService.cancelRecovery(row.id).subscribe({
      next: () => {
        this.spinner.hide();
        this.alertService.showSuccess('Recouvrement annulé avec succès.');
        this.loadData();
      },
      error: (err) => {
        this.spinner.hide();
        this.alertService.showError(err?.message || 'Erreur lors de l\'annulation du recouvrement');
      }
    });
  }
}
