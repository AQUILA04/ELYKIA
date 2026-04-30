import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgxPermissionsService } from 'ngx-permissions';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subscription } from 'rxjs';
import { ClientService } from 'src/app/client/service/client.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { UserService } from 'src/app/user/service/user.service';
import { CreditSearchDto } from '../components/advanced-search/advanced-search.types';
import { CreditService } from '../service/credit.service';
import { Collector } from '../types/credit-merge.types';
import { PageEvent } from '@angular/material/paginator';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';
import { ErrorHandlingMixin } from 'src/app/shared/mixins/error-handling.mixin';
import { CreditTimelineDto } from '../types/credit.types';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';



@Component({
  selector: 'app-credit-list',
  templateUrl: './credit-list.component.html',
  styleUrls: ['./credit-list.component.scss']
})
export class CreditListComponent extends ErrorHandlingMixin implements OnInit, OnDestroy {
  credits: any[] = [];
  // La variable filteredCredits est toujours utilisée pour l'affichage
  filteredCredits: any[] = [];
  searchTerm: string = '';
  pageSize: number = 5;
  currentPage: number = 0;
  isLoading = true;
  totalElement = 0;
  showMergeModal: boolean = false;
  collectors: Collector[] = [];

  // Variables pour le modal de mise
  showDailyStakeModal = false;
  selectedCreditForStake: any = null;

  // Selection variables
  selectedCredits: Set<number> = new Set();
  isAllSelected: boolean = false;
  showBulkChangeCollectorModal: boolean = false;
  selectedNewCollector: string = '';

  private subscriptions: Subscription[] = [];

  showAdvancedSearch: boolean = false;
  currentSearchDto: CreditSearchDto | null = null;

  // User-specific properties
  currentUser: any = null;
  isPromoter: boolean = false;
  isRecoveryManager: boolean = false;

  constructor(
    private creditService: CreditService,
    private router: Router,
    private permissionsService: NgxPermissionsService,
    private spinner: NgxSpinnerService,
    private tokenStorage : TokenStorageService,
    private alertService: AlertService,
    private userService: UserService,
    private clientService: ClientService,
    errorHandler: ErrorHandlerService
  ) {
    super(errorHandler);
    this.tokenStorage.checkConnectedUser();
    this.currentUser = this.tokenStorage.getUser();
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    this.isRecoveryManager = this.userService.hasProfile(UserProfile.RECOVERY_MANAGER);
  }

  ngOnInit(): void {
    this.loadInitialSearch();
    this.loadCredits();
  }

  ngOnDestroy(): void {
    // Clean up all subscriptions
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];
  }

  private getSearchStorageKey(): string | null {
    if (this.currentUser && this.currentUser.id) {
      return `credit_search_filters_${this.currentUser.id}`;
    }
    return null;
  }

  private getPaginationStorageKey(): string | null {
    if (this.currentUser && this.currentUser.id) {
      return `credit_pagination_${this.currentUser.id || this.currentUser.username}`;
    }
    return null;
  }

  private getSearchTermStorageKey(): string | null {
    if (this.currentUser && this.currentUser.id) {
      return `credit_search_term_${this.currentUser.id || this.currentUser.username}`;
    }
    return null;
  }

  private loadInitialSearch(): void {
    const storageKey = this.getSearchStorageKey();
    if (storageKey) {
      const savedSearch = localStorage.getItem(storageKey);
      if (savedSearch) {
        this.currentSearchDto = JSON.parse(savedSearch);
      }
    }

    const paginationKey = this.getPaginationStorageKey();
    if (paginationKey) {
      const savedPagination = localStorage.getItem(paginationKey);
      if (savedPagination) {
        const pagination = JSON.parse(savedPagination);
        this.pageSize = pagination.pageSize || 5;
        this.currentPage = pagination.currentPage || 0;
      }
    }

    const searchTermKey = this.getSearchTermStorageKey();
    if (searchTermKey) {
      const savedSearchTerm = localStorage.getItem(searchTermKey);
      if (savedSearchTerm) {
        this.searchTerm = savedSearchTerm;
      }
    }
  }

  loadCredits(): void {
    this.spinner.show();
    this.isLoading = true;

    // Si une recherche avancée est active, l'utiliser
    if (this.currentSearchDto) {
      this.performAdvancedSearch(this.currentSearchDto);
      return;
    }

    // Sinon, recherche simple
    const sanitizedSearchTerm = this.sanitizeSearchTerm(this.searchTerm);

    const subscription = this.creditService.getCredit(this.currentPage, this.pageSize, sanitizedSearchTerm).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.credits = response.data.content || [];
          this.filteredCredits = [...this.credits];
          this.totalElement = response.data.page.totalElements || 0;
          // Reset selection on page load
          this.selectedCredits.clear();
          this.isAllSelected = false;
        } else {
          this.alertService.showError(response.message || 'Réponse inattendue du serveur.');
          this.credits = [];
          this.filteredCredits = [];
          this.totalElement = 0;
        }
        this.spinner.hide();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des crédits:', error);
        const errorMessage = error?.error?.message || 'Erreur lors du chargement des crédits.';
        this.alertService.showError(errorMessage);
        this.credits = [];
        this.filteredCredits = [];
        this.totalElement = 0;
        this.spinner.hide();
        this.isLoading = false;
      }
    });

    this.subscriptions.push(subscription);
  }

  // NOUVELLE MÉTHODE : Recherche avancée
  performAdvancedSearch(searchDto: CreditSearchDto): void {
    this.spinner.show();
    this.isLoading = true;
    this.showAdvancedSearch = !this.showAdvancedSearch ? true : this.showAdvancedSearch;

    const subscription = this.creditService.searchCredits(searchDto, this.currentPage, this.pageSize).subscribe({
      next: (response: any) => {
        if (response.statusCode === 200) {
          this.credits = response.data.content || [];
          this.filteredCredits = [...this.credits];
          this.totalElement = response.data.page.totalElements || 0;
          // Reset selection on page load
          this.selectedCredits.clear();
          this.isAllSelected = false;
        } else {
          this.alertService.showError(response.message || 'Réponse inattendue du serveur.');
          this.credits = [];
          this.filteredCredits = [];
          this.totalElement = 0;
        }
        this.spinner.hide();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la recherche:', error);
        this.alertService.showError('Erreur lors de la recherche des crédits.');
        this.credits = [];
        this.filteredCredits = [];
        this.totalElement = 0;
        this.spinner.hide();
        this.isLoading = false;
      }
    });

    this.subscriptions.push(subscription);
  }

  // NOUVELLE MÉTHODE : Toggle recherche avancée
  toggleAdvancedSearch(): void {
    this.loadCollectors();
    this.showAdvancedSearch = !this.showAdvancedSearch;
    if (!this.showAdvancedSearch) {
      // Si on ferme, réinitialiser la recherche
      this.onSearchReset();
    }
  }

  // NOUVELLE MÉTHODE : Handler de recherche avancée
  onAdvancedSearch(searchDto: CreditSearchDto): void {
    this.currentSearchDto = searchDto;
    this.currentPage = 0;

    const storageKey = this.getSearchStorageKey();
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(searchDto));
    }

    this.performAdvancedSearch(searchDto);
  }

  // NOUVELLE MÉTHODE : Reset de la recherche
  onSearchReset(): void {
    this.currentSearchDto = null;
    this.currentPage = 0;
    this.searchTerm = '';

    const storageKey = this.getSearchStorageKey();
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }

    const searchTermKey = this.getSearchTermStorageKey();
    if (searchTermKey) {
      localStorage.removeItem(searchTermKey);
    }

    this.loadCredits();
  }

  // NOUVELLE MÉTHODE : Fermeture de la recherche avancée
  onCloseAdvancedSearch(): void {
    this.showAdvancedSearch = false;
  }


  // MODIFIÉ : La pagination recharge les données depuis le serveur
  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;

    const paginationKey = this.getPaginationStorageKey();
    if (paginationKey) {
      localStorage.setItem(paginationKey, JSON.stringify({ pageSize: this.pageSize, currentPage: this.currentPage }));
    }

    this.loadCredits();
  }

  // MODIFIÉ : La recherche recharge les données depuis le serveur
  filterCredits(): void {
    this.currentPage = 0; // On retourne à la première page

    const searchTermKey = this.getSearchTermStorageKey();
    if (searchTermKey) {
      localStorage.setItem(searchTermKey, this.searchTerm);
    }

    this.loadCredits();
  }

  refresh(): void {
    this.searchTerm = ''; // On vide aussi la recherche
    this.currentPage = 0;
    this.onSearchReset();
  }

  // --- Le reste de vos méthodes (add, delete, etc.) reste identique car elles appellent déjà loadCredits() ---

  addCredit(): void {
    this.router.navigate(['/credit-add']);
  }

  viewDetails(id: number): void {
    this.router.navigate(['/credit-details', id]);
  }

  editCredit(id: number): void {
    this.router.navigate(['/credit-add', id]);
  }

  validateCredit(id: number): void {
    this.alertService.showConfirmation('Confirmation de validation', 'Voulez-vous vraiment valider cette vente?', 'Valider', 'Annuler')
    .then(result => {
      if (result) {
        this.creditService.validateCredit(id).subscribe(
          () => {
            this.alertService.showSuccess('La vente a été validée avec succès.', 'success');
            this.loadCredits();
          },
          error => {
            const errorMessage = error?.error?.message || 'Erreur lors de la validation du crédit';
            this.alertService.showError(errorMessage, 'error');
          }
        );
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
          this.loadCredits();
        }
      },
      error: (error: any) => {
        // Utiliser le message spécifique du backend
        this.handleError(error);
      }
    });
  }

  distributeCredit(id: number): void {
    this.router.navigate(['/distribute', id]);
  }

  deleteCredit(id: number): void {
    this.alertService.showConfirmation('Confirmation de suppression', 'Voulez-vous vraiment supprimer cette vente?', 'Supprimer', 'Annuler')
    .then(result => {
      if (result) {
        this.creditService.deleteCredit(id).subscribe({
          next: () => {
            this.alertService.showSuccess('La vente a été supprimée avec succès.', 'Opération réussie');
            this.loadCredits();
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
      return 'badge-danger';
    } else if (remainingDaysCount <= 5) {
      return 'badge-warning';
    } else {
      return 'badge-success';
    }
  }

  addTontineDelivery(): void {
    this.router.navigate(['/create-tontine']);
  }

  openMergeModal(): void {
    console.log('Opening merge modal...');
    this.loadCollectors();
    this.showMergeModal = true;
    console.log('Modal should be visible now, showMergeModal:', this.showMergeModal);
  }

  loadCollectors(): void {
    console.log('Loading collectors...');
    this.spinner.show();
    const subscription = this.clientService.getAgents().subscribe({
      next: (data: any) => {
        this.collectors = data;
        console.log("listes des commerciaux", this.collectors);
        console.log("collectors length:", this.collectors?.length);
        this.spinner.hide();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des commerciaux', error);
        this.alertService.showError('Erreur lors du chargement des commerciaux');
        this.collectors = [];
        this.spinner.hide();
      }
    });

    this.subscriptions.push(subscription);
  }

  closeMergeModal(): void {
    this.showMergeModal = false;
  }

  onMergeSuccess(newCreditReference: string): void {
    // Validate the new credit reference
    const sanitizedReference = this.sanitizeInput(newCreditReference);
    if (!sanitizedReference) {
      this.alertService.showError('Référence de crédit invalide reçue');
      return;
    }

    this.alertService.showSuccess(
      `Fusion réussie ! Nouvelle référence : ${sanitizedReference}`,
      'Fusion des crédits'
    );
    this.loadCredits(); // Refresh the credit list
    this.closeMergeModal();
  }

  // Input validation and sanitization methods
  private sanitizeInput(input: string): string {
    if (!input) return '';

    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove HTML/script injection characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 100); // Limit length
  }

  private sanitizeSearchTerm(searchTerm: string): string {
    if (!searchTerm) return '';

    return searchTerm
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, 50); // Limit search term length
  }

  private isValidCollector(user: any): boolean {
    return user &&
           user.username &&
           user.firstname &&
           user.lastname &&
           typeof user.username === 'string' &&
           typeof user.firstname === 'string' &&
           typeof user.lastname === 'string' &&
           user.username.length > 0 &&
           user.firstname.length > 0 &&
           user.lastname.length > 0;
  }

  // NOUVELLE MÉTHODE AJOUTÉE
  // Cette méthode est appelée par le nouveau bouton et redirige l'utilisateur
  // vers la page de modification, en passant l'ID du crédit dans l'URL.
  changeDailyStake(id: number): void {
    this.router.navigate(['/change-daily-stake', id]);
  }

  // --- Gestion du modal de mise ---

  openDailyStakeModal(credit: any): void {
    this.selectedCreditForStake = credit;
    this.showDailyStakeModal = true;
  }

  closeDailyStakeModal(): void {
    this.showDailyStakeModal = false;
    this.selectedCreditForStake = null;
  }

  onDailyStakeSubmit(dto: CreditTimelineDto): void {
    this.spinner.show();
    this.creditService.makeDailyStake(dto).subscribe({
      next: (response: any) => {
        this.spinner.hide();
        if (response.statusCode === 201 || response.statusCode === 200) {
          this.alertService.showSuccess('Mise effectuée avec succès');
          this.closeDailyStakeModal();
          this.loadCredits(); // Rafraîchir la liste
        } else {
          this.alertService.showError(response.message || 'Erreur lors de la mise');
        }
      },
      error: (error) => {
        this.spinner.hide();
        console.error('Erreur lors de la mise:', error);
        this.alertService.showError(error.error?.message || 'Erreur lors de la mise');
      }
    });
  }

  // --- Bulk Change Collector ---

  toggleSelection(id: number): void {
    if (this.selectedCredits.has(id)) {
      this.selectedCredits.delete(id);
    } else {
      this.selectedCredits.add(id);
    }
    this.isAllSelected = this.filteredCredits.length > 0 && this.selectedCredits.size === this.filteredCredits.length;
  }

  toggleAllSelection(): void {
    if (this.isAllSelected) {
      this.selectedCredits.clear();
    } else {
      this.filteredCredits.forEach(c => this.selectedCredits.add(c.id));
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
        this.loadCredits();
      },
      error: (error) => {
        this.spinner.hide();
        this.alertService.showError('Erreur lors du changement de commercial.');
        console.error(error);
      }
    });
    this.subscriptions.push(sub);
  }
}
