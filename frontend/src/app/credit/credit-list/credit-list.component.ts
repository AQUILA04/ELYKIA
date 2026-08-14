import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subscription } from 'rxjs';
import { ClientService } from 'src/app/client/service/client.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { UserService } from 'src/app/user/service/user.service';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';
import { ErrorHandlingMixin } from 'src/app/shared/mixins/error-handling.mixin';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { AuthService } from 'src/app/auth/service/auth.service';
import { KpiFinancierPermissions } from 'src/app/shared/constants/kpi-financier-permission.constant';
import { CreditSearchDto } from '../components/advanced-search/advanced-search.types';
import { CreditService } from '../service/credit.service';
import { Collector } from '../types/credit-merge.types';
import { CreditTimelineDto } from '../types/credit.types';
import {
  CreditListPeriodPreset,
  CreditListState,
  CreditListSummary
} from '../types/credit-list-summary.types';

@Component({
  selector: 'app-credit-list',
  templateUrl: './credit-list.component.html',
  styleUrls: ['./credit-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class CreditListComponent extends ErrorHandlingMixin implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'creditListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;
  private subscriptions: Subscription[] = [];

  credits: any[] = [];
  filteredCredits: any[] = [];
  searchTerm = '';
  pageSize = 5;
  currentPage = 0;
  isLoading = true;
  totalElement = 0;
  showMergeModal = false;
  collectors: Collector[] = [];

  showDailyStakeModal = false;
  selectedCreditForStake: any = null;
  isSubmittingStake = false;

  selectedCredits: Set<number> = new Set();
  isAllSelected = false;
  showBulkChangeCollectorModal = false;
  selectedNewCollector = '';

  showAdvancedSearch = false;
  currentSearchDto: CreditSearchDto | null = null;
  activeFiltersCount = 0;

  currentUser: any = null;
  isPromoter = false;
  isRecoveryManager = false;

  currentDate = new Date();
  lastUpdate = new Date();

  periodPreset: CreditListPeriodPreset = CreditListPeriodPreset.MONTH;
  customStartDate = '';
  customEndDate = '';
  periodLabel = '';
  readonly periodPresets = CreditListPeriodPreset;

  summary: CreditListSummary | null = null;
  summaryLoading = true;

  constructor(
    private creditService: CreditService,
    private router: Router,
    private spinner: NgxSpinnerService,
    private tokenStorage: TokenStorageService,
    private alertService: AlertService,
    private userService: UserService,
    private clientService: ClientService,
    private authService: AuthService,
    errorHandler: ErrorHandlerService
  ) {
    super(errorHandler);
    this.tokenStorage.checkConnectedUser();
    this.currentUser = this.tokenStorage.getUser();
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    this.isRecoveryManager = this.userService.hasProfile(UserProfile.RECOVERY_MANAGER);
  }

  ngOnInit(): void {
    this.restoreState();
    this.updatePeriodLabel();
    this.loadSummary();
    this.loadCredits();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.saveState();
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];
  }

  private saveState(): void {
    const state: CreditListState = {
      searchTerm: this.searchTerm,
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      currentSearchDto: this.currentSearchDto,
      showAdvancedSearch: this.showAdvancedSearch,
      periodPreset: this.periodPreset,
      customStartDate: this.customStartDate || null,
      customEndDate: this.customEndDate || null
    };
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    const raw = sessionStorage.getItem(this.STATE_KEY);
    if (!raw) {
      this.initDefaultPeriod();
      return;
    }
    try {
      const state = JSON.parse(raw) as CreditListState;
      this.searchTerm = state.searchTerm ?? '';
      this.currentPage = state.currentPage ?? 0;
      this.pageSize = state.pageSize ?? 5;
      this.currentSearchDto = state.currentSearchDto ?? null;
      this.showAdvancedSearch = state.showAdvancedSearch ?? false;
      this.periodPreset = state.periodPreset ?? CreditListPeriodPreset.MONTH;
      this.customStartDate = state.customStartDate ?? '';
      this.customEndDate = state.customEndDate ?? '';
      if (this.periodPreset === CreditListPeriodPreset.CUSTOM && (!this.customStartDate || !this.customEndDate)) {
        this.initDefaultPeriod();
      }
      this.activeFiltersCount = this.countActiveFilters(this.currentSearchDto);
    } catch {
      this.initDefaultPeriod();
    }
  }

  private initDefaultPeriod(): void {
    this.periodPreset = CreditListPeriodPreset.MONTH;
    const range = this.getPeriodRange();
    this.customStartDate = range.startDate;
    this.customEndDate = range.endDate;
  }

  getPeriodRange(): { startDate: string; endDate: string } {
    const today = new Date();
    const endDate = this.formatDate(today);
    let start: Date;

    switch (this.periodPreset) {
      case CreditListPeriodPreset.TODAY:
        start = today;
        break;
      case CreditListPeriodPreset.WEEK: {
        start = new Date(today);
        const day = start.getDay();
        const diff = day === 0 ? 6 : day - 1;
        start.setDate(start.getDate() - diff);
        break;
      }
      case CreditListPeriodPreset.CUSTOM:
        if (this.customStartDate && this.customEndDate) {
          return { startDate: this.customStartDate, endDate: this.customEndDate };
        }
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case CreditListPeriodPreset.MONTH:
      default:
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
    }

    return { startDate: this.formatDate(start), endDate };
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private updatePeriodLabel(): void {
    const range = this.getPeriodRange();
    const start = this.formatDisplayDate(range.startDate);
    const end = this.formatDisplayDate(range.endDate);
    if (range.startDate === range.endDate) {
      this.periodLabel = start;
      return;
    }
    this.periodLabel = `${start} → ${end}`;
  }

  private formatDisplayDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  onPeriodPresetChange(preset: CreditListPeriodPreset): void {
    this.periodPreset = preset;
    if (preset !== CreditListPeriodPreset.CUSTOM) {
      const range = this.getPeriodRange();
      this.customStartDate = range.startDate;
      this.customEndDate = range.endDate;
    }
    this.updatePeriodLabel();
    this.saveState();
    this.loadSummary();
  }

  onCustomPeriodChange(): void {
    if (this.customStartDate && this.customEndDate) {
      this.periodPreset = CreditListPeriodPreset.CUSTOM;
      this.updatePeriodLabel();
      this.saveState();
      this.loadSummary();
    }
  }

  loadSummary(): void {
    void this.authService.hasPermission(KpiFinancierPermissions.Vente).then((allowed) => {
      if (!allowed) {
        this.summary = null;
        this.summaryLoading = false;
        return;
      }
      this.summaryLoading = true;
      const range = this.getPeriodRange();
      const sub = this.creditService.getListSummary({
        startDate: range.startDate,
        endDate: range.endDate,
        search: this.currentSearchDto
      }).subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.summary = response.data;
          } else {
            this.summary = null;
          }
          this.summaryLoading = false;
        },
        error: (error) => {
          console.error('Erreur chargement KPI ventes', error);
          this.summary = null;
          this.summaryLoading = false;
        }
      });
      this.subscriptions.push(sub);
    });
  }

  loadCredits(): void {
    this.isLoading = true;

    if (this.currentSearchDto) {
      this.performAdvancedSearch(this.currentSearchDto);
      return;
    }

    const sanitizedSearchTerm = this.sanitizeSearchTerm(this.searchTerm);
    const subscription = this.creditService.getCredit(this.currentPage, this.pageSize, sanitizedSearchTerm).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.credits = response.data.content || [];
          this.filteredCredits = [...this.credits];
          this.totalElement = response.data.page.totalElements || 0;
          this.selectedCredits.clear();
          this.isAllSelected = false;
          this.lastUpdate = new Date();
        } else {
          this.alertService.showError(response.message || 'Réponse inattendue du serveur.');
          this.credits = [];
          this.filteredCredits = [];
          this.totalElement = 0;
        }
        this.isLoading = false;
        this.saveState();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des crédits:', error);
        const errorMessage = error?.error?.message || 'Erreur lors du chargement des crédits.';
        this.alertService.showError(errorMessage);
        this.credits = [];
        this.filteredCredits = [];
        this.totalElement = 0;
        this.isLoading = false;
      }
    });

    this.subscriptions.push(subscription);
  }

  performAdvancedSearch(searchDto: CreditSearchDto): void {
    this.isLoading = true;

    const subscription = this.creditService.searchCredits(searchDto, this.currentPage, this.pageSize).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.credits = response.data.content || [];
          this.filteredCredits = [...this.credits];
          this.totalElement = response.data.page.totalElements || 0;
          this.selectedCredits.clear();
          this.isAllSelected = false;
          this.lastUpdate = new Date();
        } else {
          this.alertService.showError(response.message || 'Réponse inattendue du serveur.');
          this.credits = [];
          this.filteredCredits = [];
          this.totalElement = 0;
        }
        this.isLoading = false;
        this.saveState();
      },
      error: (error) => {
        console.error('Erreur lors de la recherche:', error);
        this.alertService.showError('Erreur lors de la recherche des crédits.');
        this.credits = [];
        this.filteredCredits = [];
        this.totalElement = 0;
        this.isLoading = false;
      }
    });

    this.subscriptions.push(subscription);
  }

  toggleAdvancedSearch(): void {
    this.loadCollectors();
    this.showAdvancedSearch = !this.showAdvancedSearch;
    this.saveState();
  }

  onAdvancedSearch(searchDto: CreditSearchDto): void {
    this.currentSearchDto = searchDto;
    this.currentPage = 0;
    this.saveState();
    this.loadSummary();
    this.performAdvancedSearch(searchDto);
  }

  onSearchReset(): void {
    this.currentSearchDto = null;
    this.currentPage = 0;
    this.searchTerm = '';
    this.activeFiltersCount = 0;
    this.saveState();
    this.loadSummary();
    this.loadCredits();
  }

  onActiveFiltersCountChange(count: number): void {
    this.activeFiltersCount = count;
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.saveState();
    this.loadCredits();
  }

  refresh(): void {
    this.loadSummary();
    this.loadCredits();
  }

  reloadAfterMutation(): void {
    this.loadSummary();
    this.loadCredits();
  }

  addCredit(): void {
    this.saveState();
    this.router.navigate(['/credit/add']);
  }

  viewDetails(id: number): void {
    this.saveState();
    this.router.navigate(['/credit/details', id]);
  }

  editCredit(id: number): void {
    this.saveState();
    this.router.navigate(['/credit/add', id]);
  }

  validateCredit(id: number): void {
    this.alertService.showConfirmation('Confirmation de validation', 'Voulez-vous vraiment valider cette vente?', 'Valider', 'Annuler')
      .then(result => {
        if (result) {
          this.creditService.validateCredit(id).subscribe({
            next: () => {
              this.alertService.showSuccess('La vente a été validée avec succès.', 'success');
              this.reloadAfterMutation();
            },
            error: (error) => {
              const errorMessage = error?.error?.message || 'Erreur lors de la validation du crédit';
              this.alertService.showError(errorMessage, 'error');
            }
          });
        }
      });
  }

  startCredit(id: number): void {
    this.creditService.startCredit(id).subscribe({
      next: (response: any) => {
        if (response.statusCode === 500) {
          this.alertService.showError(response.message, 'Erreur');
        } else {
          this.alertService.showSuccess('La sortie effectuée avec succès', 'Opération réussie');
          this.reloadAfterMutation();
        }
      },
      error: (error: any) => {
        this.handleError(error);
      }
    });
  }

  deleteCredit(id: number): void {
    this.alertService.showConfirmation('Confirmation de suppression', 'Voulez-vous vraiment supprimer cette vente?', 'Supprimer', 'Annuler')
      .then(result => {
        if (result) {
          this.creditService.deleteCredit(id).subscribe({
            next: () => {
              this.alertService.showSuccess('La vente a été supprimée avec succès.', 'Opération réussie');
              this.reloadAfterMutation();
            },
            error: (error) => {
              this.alertService.showError('Erreur lors de la suppression du crédit', 'Opération échouée!');
              console.error(error);
            }
          });
        }
      });
  }

  getBadgeClass(remainingDaysCount: number): string {
    if (remainingDaysCount === 0) {
      return 'days-badge days-danger';
    }
    if (remainingDaysCount <= 5) {
      return 'days-badge days-warning';
    }
    return 'days-badge days-success';
  }

  loadCollectors(): void {
    if (this.collectors.length > 0) {
      return;
    }
    const subscription = this.clientService.getAgents().subscribe({
      next: (data: any) => {
        this.collectors = data;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des commerciaux', error);
        this.alertService.showError('Erreur lors du chargement des commerciaux');
        this.collectors = [];
      }
    });
    this.subscriptions.push(subscription);
  }

  changeDailyStake(id: number): void {
    this.saveState();
    this.router.navigate(['/credit/change-daily-stake', id]);
  }

  openDailyStakeModal(credit: any): void {
    this.selectedCreditForStake = credit;
    this.isSubmittingStake = false;
    this.showDailyStakeModal = true;
  }

  closeDailyStakeModal(): void {
    this.showDailyStakeModal = false;
    this.selectedCreditForStake = null;
  }

  onDailyStakeSubmit(dto: CreditTimelineDto): void {
    if (this.isSubmittingStake) {
      return;
    }
    this.isSubmittingStake = true;
    this.spinner.show();
    this.creditService.makeDailyStake(dto).subscribe({
      next: (response: any) => {
        this.spinner.hide();
        if (response.statusCode === 201 || response.statusCode === 200) {
          this.alertService.showSuccess('Mise effectuée avec succès');
          this.isSubmittingStake = false;
          this.closeDailyStakeModal();
          this.reloadAfterMutation();
        } else {
          this.alertService.showError(response.message || 'Erreur lors de la mise');
          this.isSubmittingStake = false;
        }
      },
      error: (error) => {
        this.spinner.hide();
        this.isSubmittingStake = false;
        console.error('Erreur lors de la mise:', error);
        this.alertService.showError(error.error?.message || 'Erreur lors de la mise');
      }
    });
  }

  toggleSelection(id: number): void {
    if (this.selectedCredits.has(id)) {
      this.selectedCredits.delete(id);
    } else {
      this.selectedCredits.add(id);
    }
    const selectableCredits = this.filteredCredits.filter(c => c.status !== 'SETTLED');
    this.isAllSelected = selectableCredits.length > 0 && this.selectedCredits.size === selectableCredits.length;
  }

  toggleAllSelection(): void {
    if (this.isAllSelected) {
      this.selectedCredits.clear();
    } else {
      this.filteredCredits
        .filter(c => c.status !== 'SETTLED')
        .forEach(c => this.selectedCredits.add(c.id));
    }
    this.isAllSelected = !this.isAllSelected;
  }

  isSelected(id: number): boolean {
    return this.selectedCredits.has(id);
  }

  openBulkChangeCollectorModal(): void {
    if (this.selectedCredits.size === 0) {
      this.alertService.showWarning('Veuillez sélectionner au moins une vente.');
      return;
    }
    this.loadCollectors();
    this.showBulkChangeCollectorModal = true;
  }

  closeBulkChangeCollectorModal(): void {
    this.showBulkChangeCollectorModal = false;
    this.selectedNewCollector = '';
  }

  confirmBulkChangeCollector(): void {
    if (!this.selectedNewCollector) {
      this.alertService.showWarning('Veuillez sélectionner un commercial.');
      return;
    }

    const dto = {
      creditIds: Array.from(this.selectedCredits),
      newCollector: this.selectedNewCollector
    };

    this.spinner.show();
    const sub = this.creditService.bulkChangeCollector(dto).subscribe({
      next: () => {
        this.spinner.hide();
        this.alertService.showSuccess('Changement de commercial effectué avec succès.');
        this.closeBulkChangeCollectorModal();
        this.selectedCredits.clear();
        this.isAllSelected = false;
        this.reloadAfterMutation();
      },
      error: (error) => {
        this.spinner.hide();
        this.alertService.showError('Erreur lors du changement de commercial.');
        console.error(error);
      }
    });
    this.subscriptions.push(sub);
  }

  closeMergeModal(): void {
    this.showMergeModal = false;
  }

  onMergeSuccess(newCreditReference: string): void {
    const sanitizedReference = this.sanitizeInput(newCreditReference);
    if (!sanitizedReference) {
      this.alertService.showError('Référence de crédit invalide reçue');
      return;
    }

    this.alertService.showSuccess(
      `Fusion réussie ! Nouvelle référence : ${sanitizedReference}`,
      'Fusion des crédits'
    );
    this.reloadAfterMutation();
    this.closeMergeModal();
  }

  private sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .trim()
      .replace(/[<>\"'&]/g, '')
      .replace(/\s+/g, ' ')
      .substring(0, 100);
  }

  private sanitizeSearchTerm(searchTerm: string): string {
    if (!searchTerm) return '';
    return searchTerm
      .trim()
      .replace(/[<>\"'&]/g, '')
      .substring(0, 50);
  }

  private countActiveFilters(dto: CreditSearchDto | null): number {
    if (!dto) return 0;
    let count = 0;
    if (dto.keyword?.trim()) count++;
    if (dto.clientType) count++;
    if (dto.type) count++;
    if (dto.status) count++;
    if (dto.commercial) count++;
    return count;
  }
}
