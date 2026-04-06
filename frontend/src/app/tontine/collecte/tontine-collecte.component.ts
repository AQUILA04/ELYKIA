import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { TontineCollecteService } from '../services/tontine-collecte.service';
import { TontineCollectionWebDto, TontineCollectionKpiDto } from '../models/tontine-collecte.model';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';

@Component({
  selector: 'app-tontine-collecte',
  templateUrl: './tontine-collecte.component.html',
  styleUrls: ['./tontine-collecte.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class TontineCollecteComponent implements OnInit {
  summary: TontineCollectionKpiDto = { totalMises: 0, totalMontant: 0 };
  collectes: TontineCollectionWebDto[] = [];
  isLoading: boolean = false;
  
  currentCollector: string = 'all';
  dateFrom: string = '';
  dateTo: string = '';

  currentDate: Date = new Date();
  lastUpdate: Date = new Date();
  
  isCommercialLogue: boolean = false;

  constructor(
    private tontineCollecteService: TontineCollecteService,
    private tokenStorage: TokenStorageService,
    private userService: UserService
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
    
    // Load summary
    this.tontineCollecteService.getSummary(this.dateFrom, this.dateTo, this.currentCollector).subscribe({
      next: (res: any) => {
        if (res.statusCode === 200 && res.data) {
          this.summary = res.data;
          this.lastUpdate = new Date();
        }
      },
      error: (err: any) => console.error(err)
    });

    // Load table data
    this.tontineCollecteService.getCollectes(this.dateFrom, this.dateTo, this.currentCollector).subscribe({
      next: (res: any) => {
        if (res.statusCode === 200 && res.data) {
          this.collectes = res.data.content || res.data;
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
}
