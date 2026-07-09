import { Component, OnInit } from '@angular/core';
import { CommercialStockService } from '../../services/commercial-stock.service';
import { AuthService } from '../../../auth/service/auth.service';
import { CommercialMonthlyStock } from '../../models/commercial-stock.model';
import { NgxSpinnerService } from 'ngx-spinner';
import { ClientService } from 'src/app/client/service/client.service';
import { PageEvent } from '@angular/material/paginator';
import { UserService } from "../../../user/service/user.service";
import { UserProfile } from "../../../shared/models/user-profile.enum";
import { MatDialog } from '@angular/material/dialog';
import { SalesDetailsDialogComponent } from '../../components/sales-details-dialog/sales-details-dialog.component';
import { StockMovementDialogComponent } from '../../components/stock-movement-dialog/stock-movement-dialog.component';
import { FeatureFlagService, FeatureFlags } from 'src/app/shared/service/feature-flag.service';
import { ToastrService } from 'ngx-toastr';
import {
  buildPreviousMonthOptions,
  getStockPeriodLabel,
  MonthOption,
  resolveStockPeriodRange,
  StockPeriodKey
} from '../../utils/stock-period.util';

@Component({
  selector: 'app-my-stock-dashboard',
  templateUrl: './my-stock-dashboard.component.html',
  styleUrls: ['./my-stock-dashboard.component.scss']
})
export class MyStockDashboardComponent implements OnInit {

  stocks: CommercialMonthlyStock[] = [];
  currentUser: any;
  loading: boolean = false;
  agents: any[] = [];
  selectedAgent: string | null = null;
  isHistoric: boolean = false;
  showStockReturnHistory: boolean = false;

  // Pagination
  totalElements: number = 0;
  pageSize: number = 20;
  pageIndex: number = 0;
  isManager = false; // Changed declaration
  isStoreKeeper = false; // Changed declaration
  isPromoter = false; // Changed declaration
  isSecretary = false;

  selectedPeriod: StockPeriodKey = 'MONTH';
  previousMonths: MonthOption[] = [];
  exportLoading = false;

  constructor(
    private commercialStockService: CommercialStockService,
    private authService: AuthService,
    private spinner: NgxSpinnerService,
    private clientService: ClientService,
    private userService: UserService,
    private dialog: MatDialog,
    private featureFlagService: FeatureFlagService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.previousMonths = buildPreviousMonthOptions();
    this.currentUser = this.authService.getCurrentUser();
    this.isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE) || this.userService.hasProfile(UserProfile.ADMIN) || this.userService.hasProfile(UserProfile.SUPER_ADMIN);
    this.isStoreKeeper = this.userService.hasProfile(UserProfile.STOREKEEPER);
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    this.isSecretary = this.userService.hasProfile(UserProfile.SECRETARY);
    this.showStockReturnHistory = this.featureFlagService.isFeatureEnabled(FeatureFlags.StockReturnHistory);
    this.loadAgents();
    this.loadCurrentStock();
  }

  loadAgents(): void {
    this.clientService.getAgents().subscribe(
      data => {
        this.agents = data;
      },
      error => {
        console.error('Erreur lors du chargement des agents', error);
      }
    );
  }

  searchAgent = (term: string, item: any) => {
    return item.username.toLowerCase().includes(term.toLowerCase());
  }

  onAgentChange(agent: string | { username: string } | null) {
    if (typeof agent === 'string') {
      this.selectedAgent = agent;
    } else {
      this.selectedAgent = agent ? agent.username : null;
    }
    this.pageIndex = 0;
    this.loadCurrentStock();
  }

  toggleHistoric() {
    this.isHistoric = !this.isHistoric;
    this.pageIndex = 0; // Reset pagination
    this.loadCurrentStock();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadCurrentStock();
  }

  loadCurrentStock() {
    this.spinner.show();
    this.commercialStockService.getAll(this.selectedAgent, this.pageIndex, this.pageSize, this.isHistoric).subscribe({
      next: (data) => {
        this.stocks = data.content;
        this.totalElements = data.page.totalElements;
        this.spinner.hide();
      },
      error: (err) => {
        console.error('Erreur chargement stock', err);
        this.spinner.hide();
      }
    });
  }

  getTotalStockValue(stock: CommercialMonthlyStock): number {
    if (!stock || !stock.items) return 0;
    return stock.items.reduce((acc, item) => acc + (item.quantityRemaining * item.weightedAverageUnitPrice), 0);
  }

  getTotalSoldValue(stock: CommercialMonthlyStock): number {
    if (!stock || !stock.items) return 0;
    return stock.items.reduce((acc, item) => acc + (item.totalSoldValue || 0), 0);
  }

  getTotalDueValue(stock: CommercialMonthlyStock): number {
    if (stock?.recoverySummary) {
      return stock.recoverySummary.totalDueAmount;
    }
    if (!stock || !stock.items) return 0;
    return this.getTotalStockValue(stock) + this.getTotalSoldValue(stock);
  }

  getTotalRecoveredValue(stock: CommercialMonthlyStock): number {
    return stock?.recoverySummary?.totalRecoveredAmount ?? 0;
  }

  getTotalRemainingToRecoverValue(stock: CommercialMonthlyStock): number {
    return stock?.recoverySummary?.totalRemainingAmount ?? 0;
  }

  getRecoveryRate(stock: CommercialMonthlyStock): number {
    return stock?.recoverySummary?.recoveryRatePercent ?? 0;
  }

  getMonthName(monthNumber: number): string {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('fr-FR', { month: 'long' });
  }

  openSalesDetails(item: any): void {
    this.dialog.open(SalesDetailsDialogComponent, {
      width: '1100px',
      maxWidth: '95vw',
      data: {
        stockItemId: item.id,
        articleName: item.article.commercialName + ' ' + item.article.name,
        quantitySold: item.quantitySold,
        totalSoldValue: item.totalSoldValue ?? 0,
        weightedAverageUnitPrice: item.weightedAverageUnitPrice ?? 0
      }
    });
  }

  openStockMovements(item: any): void {
    this.dialog.open(StockMovementDialogComponent, {
      width: '700px',
      data: {
        stockItemId: item.id,
        articleName: item.article.commercialName + ' ' + item.article.name,
        quantityTaken: item.quantityTaken
      }
    });
  }

  get periodLabel(): string {
    return getStockPeriodLabel(this.selectedPeriod);
  }

  onExportPdf(): void {
    const range = resolveStockPeriodRange(this.selectedPeriod);
    this.exportLoading = true;
    this.commercialStockService.exportPdf(range.startDate, range.endDate, this.selectedAgent).subscribe({
      next: (data) => {
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rapport_stock_commercial_${range.startDate}_${range.endDate}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.exportLoading = false;
        this.toastr.success('Rapport stock téléchargé avec succès');
      },
      error: (err) => {
        console.error('Export error', err);
        this.toastr.error('Erreur lors du téléchargement du PDF');
        this.exportLoading = false;
      }
    });
  }
}
