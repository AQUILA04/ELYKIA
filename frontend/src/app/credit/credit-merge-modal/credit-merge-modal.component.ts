import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { CreditService, CreditSummaryDto, MergeCreditDto } from '../service/credit.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { Subscription } from 'rxjs';
import {
  Collector,
  ValidationErrors,
  CreditMergeValidationResult,
  isValidCollector,
  isValidCreditIdArray,
  CREDIT_MERGE_CONSTANTS,
  VALIDATION_MESSAGES
} from '../types/credit-merge.types';

@Component({
  selector: 'app-credit-merge-modal',
  templateUrl: './credit-merge-modal.component.html',
  styleUrls: ['./credit-merge-modal.component.scss']
})
export class CreditMergeModalComponent implements OnInit, OnDestroy {
  @Input()
  set collectors(value: Collector[]) {
    // Validate and sanitize collectors input
    this._collectors = this.validateAndSanitizeCollectors(value || []);
  }
  get collectors(): Collector[] {
    return this._collectors;
  }
  private _collectors: Collector[] = [];
  @Output() onMergeSuccess = new EventEmitter<string>();
  @Output() onClose = new EventEmitter<void>();

  selectedCommercial: string = '';
  mergeableCredits: CreditSummaryDto[] = [];
  selectedCreditIds: number[] = [];
  loading: boolean = false;
  merging: boolean = false;

  // Enhanced form validation and user feedback properties with strict typing
  validationErrors: ValidationErrors = {};
  showValidationMessages: boolean = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private creditService: CreditService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    console.log('CreditMergeModal initialized');
    console.log('Collectors received:', this.collectors);
    console.log('Collectors length:', this.collectors?.length);
  }

  ngOnDestroy(): void {
    // Comprehensive cleanup
    this.cleanupComponent();
  }

  onCommercialChange(): void {
    // Clear validation errors when commercial changes
    this.clearValidationErrors();

    // Sanitize and validate commercial input
    const sanitizedCommercial = this.sanitizeInput(this.selectedCommercial);
    if (!sanitizedCommercial || sanitizedCommercial.trim() === '') {
      this.mergeableCredits = [];
      this.selectedCreditIds = [];
      return;
    }

    // Update with sanitized value
    this.selectedCommercial = sanitizedCommercial;

    this.loading = true;
    this.mergeableCredits = [];
    this.selectedCreditIds = [];

    const subscription = this.creditService.getMergeableCredits(this.selectedCommercial).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.statusCode === 200 && response.data) {
          this.mergeableCredits = response.data;
          if (response.data.length === 0) {
            this.showInfoMessage('Aucun crédit fusionnable trouvé pour ce commercial');
          }
        } else {
          this.mergeableCredits = [];
          if (response.message) {
            this.alertService.showError(response.message);
          }
        }
      },
      error: (error) => {
        this.loading = false;
        this.mergeableCredits = [];
        this.showErrorMessage('Erreur lors du chargement des crédits fusionnables', error.message);
      }
    });

    this.subscriptions.push(subscription);
  }

  onCreditSelection(creditId: number, isSelected: boolean): void {
    // Validate credit ID
    if (!this.isValidCreditId(creditId)) {
      console.error('Invalid credit ID provided:', creditId);
      return;
    }

    // Clear validation errors when user makes selection
    this.clearValidationErrors();

    if (isSelected) {
      // Add credit ID if not already selected
      if (!this.selectedCreditIds.includes(creditId)) {
        this.selectedCreditIds.push(creditId);
      }
    } else {
      // Remove credit ID from selection
      const index = this.selectedCreditIds.indexOf(creditId);
      if (index > -1) {
        this.selectedCreditIds.splice(index, 1);
      }
    }
  }

  mergeCreditsList(): void {
    // Comprehensive form validation
    if (!this.validateForm()) {
      this.showValidationMessages = true;
      return;
    }

    if (!this.canMerge) {
      this.showErrorMessage('Validation échouée', 'Impossible de procéder à la fusion');
      return;
    }

    // Additional security validation
    if (!this.validateMergeOperation()) {
      return;
    }

    this.merging = true;
    this.clearValidationErrors();

    // Sanitize data before sending
    const mergeData: MergeCreditDto = {
      creditIds: [...this.selectedCreditIds].filter(id => this.isValidCreditId(id)),
      commercialUsername: this.sanitizeInput(this.selectedCommercial)
    };

    // Final validation of merge data
    if (mergeData.creditIds.length < 2 || !mergeData.commercialUsername) {
      this.merging = false;
      this.showErrorMessage('Données invalides', 'Les données de fusion sont invalides');
      return;
    }

    const subscription = this.creditService.mergeCredits(mergeData).subscribe({
      next: (response) => {
        this.merging = false;
        if (response.statusCode === 200 && response.data) {
          this.showSuccessMessage(
            `Fusion réussie ! Nouvelle référence : ${response.data}`,
            'Fusion des crédits'
          );
          this.onMergeSuccess.emit(response.data);
          this.closeModal();
        } else {
          this.showErrorMessage(
            'Erreur lors de la fusion des crédits',
            response.message || 'Une erreur inattendue s\'est produite'
          );
        }
      },
      error: (error) => {
        this.merging = false;
        this.showErrorMessage(
          'Erreur lors de la fusion des crédits',
          error.message || 'Une erreur inattendue s\'est produite'
        );
      }
    });

    this.subscriptions.push(subscription);
  }

  closeModal(): void {
    // Check if operation is in progress and ask for confirmation
    if (this.loading || this.merging) {
      this.showConfirmationBeforeClose();
      return;
    }

    this.resetModalState();
    this.onClose.emit();
  }

  private showConfirmationBeforeClose(): void {
    const operationType = this.loading ? 'chargement' : 'fusion';
    const message = `Une opération de ${operationType} est en cours. Voulez-vous vraiment fermer le modal ?`;

    this.alertService.showConfirmation('Confirmation', message).then((confirmed) => {
      if (confirmed) {
        this.resetModalState();
        this.onClose.emit();
      }
    });
  }

  private resetModalState(): void {
    this.selectedCommercial = '';
    this.mergeableCredits = [];
    this.selectedCreditIds = [];
    this.loading = false;
    this.merging = false;
    this.cleanupComponent();
  }

  get selectedCreditsCount(): number {
    return this.selectedCreditIds.length;
  }

  get canMerge(): boolean {
    return this.selectedCreditIds.length >= 2 && !this.merging;
  }

  // Form validation methods
  private validateForm(): boolean {
    this.validationErrors = {};
    let isValid = true;

    // Validate commercial selection with enhanced security
    const sanitizedCommercial = this.sanitizeInput(this.selectedCommercial);
    if (!sanitizedCommercial || sanitizedCommercial.trim() === '') {
      this.validationErrors['commercial'] = VALIDATION_MESSAGES.COMMERCIAL_REQUIRED;
      isValid = false;
    } else if (!this.isValidCommercialUsername(sanitizedCommercial)) {
      this.validationErrors['commercial'] = VALIDATION_MESSAGES.COMMERCIAL_INVALID;
      isValid = false;
    }

    // Validate credit selection with strict type checking
    if (this.selectedCreditIds.length < CREDIT_MERGE_CONSTANTS.MIN_CREDITS_TO_MERGE) {
      this.validationErrors['credits'] = VALIDATION_MESSAGES.CREDITS_MIN_REQUIRED;
      isValid = false;
    } else if (this.selectedCreditIds.length > CREDIT_MERGE_CONSTANTS.MAX_CREDITS_TO_MERGE) {
      this.validationErrors['credits'] = VALIDATION_MESSAGES.CREDITS_MAX_EXCEEDED;
      isValid = false;
    }

    // Validate that all selected credit IDs are valid
    const invalidCreditIds = this.selectedCreditIds.filter(id => !this.isValidCreditId(id));
    if (invalidCreditIds.length > 0) {
      this.validationErrors['credits'] = 'Certains crédits sélectionnés sont invalides';
      isValid = false;
    }

    // Validate that selected credits exist in mergeable credits
    const availableCreditIds = this.mergeableCredits.map(credit => credit.id);
    const unavailableCredits = this.selectedCreditIds.filter(id => !availableCreditIds.includes(id));
    if (unavailableCredits.length > 0) {
      this.validationErrors['credits'] = 'Certains crédits sélectionnés ne sont plus disponibles';
      isValid = false;
    }

    return isValid;
  }

  private validateMergeOperation(): boolean {
    // Additional business logic validation
    if (this.merging) {
      this.showErrorMessage('Opération en cours', 'Une fusion est déjà en cours');
      return false;
    }

    if (!this.mergeableCredits || this.mergeableCredits.length === 0) {
      this.showErrorMessage('Aucun crédit disponible', 'Aucun crédit fusionnable n\'est disponible');
      return false;
    }

    // Validate that the commercial still has the selected credits
    const selectedCredits = this.mergeableCredits.filter(credit =>
      this.selectedCreditIds.includes(credit.id)
    );

    if (selectedCredits.length !== this.selectedCreditIds.length) {
      this.showErrorMessage('Crédits non disponibles', 'Certains crédits sélectionnés ne sont plus disponibles');
      return false;
    }

    return true;
  }

  private clearValidationErrors(): void {
    this.validationErrors = {};
    this.showValidationMessages = false;
  }

  // User feedback methods
  private showSuccessMessage(message: string, title: string = 'Succès'): void {
    this.alertService.showSuccess(message, title);
  }

  private showErrorMessage(title: string, message: string): void {
    this.alertService.showError(message, title);
  }

  private showInfoMessage(message: string): void {
    this.alertService.showWarning(message, 'Information');
  }

  // Getter methods for template
  get hasValidationError(): boolean {
    return Object.keys(this.validationErrors).length > 0;
  }

  getValidationError(field: string): string {
    return this.validationErrors[field] || '';
  }

  hasFieldError(field: string): boolean {
    return this.showValidationMessages && !!this.validationErrors[field];
  }

  // Input sanitization and validation methods
  private sanitizeInput(input: string): string {
    if (!input) return '';

    // Remove potentially dangerous characters and trim whitespace
    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove HTML/script injection characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, CREDIT_MERGE_CONSTANTS.MAX_USERNAME_LENGTH); // Use constant for length limit
  }

  private validateAndSanitizeCollectors(collectors: any[]): Collector[] {
    if (!Array.isArray(collectors)) {
      console.warn('Invalid collectors input: expected array');
      return [];
    }

    return collectors
      .filter(collector => {
        if (!isValidCollector(collector)) {
          console.warn('Invalid collector object:', collector);
          return false;
        }
        return true;
      })
      .map(collector => ({
        username: this.sanitizeInput(collector.username),
        firstname: this.sanitizeInput(collector.firstname).substring(0, CREDIT_MERGE_CONSTANTS.MAX_NAME_LENGTH),
        lastname: this.sanitizeInput(collector.lastname).substring(0, CREDIT_MERGE_CONSTANTS.MAX_NAME_LENGTH)
      }))
      .filter(collector =>
        collector.username.length > 0 &&
        collector.firstname.length > 0 &&
        collector.lastname.length > 0
      );
  }

  private isValidCommercialUsername(username: string): boolean {
    if (!username) return false;

    // Username should be alphanumeric with possible underscores/hyphens
    const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    return usernameRegex.test(username);
  }

  private isValidCreditId(creditId: number): boolean {
    return typeof creditId === 'number' &&
           creditId > 0 &&
           Number.isInteger(creditId) &&
           creditId <= Number.MAX_SAFE_INTEGER;
  }

  // Enhanced component cleanup
  private cleanupComponent(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];

    // Reset all component state
    this.selectedCommercial = '';
    this.mergeableCredits = [];
    this.selectedCreditIds = [];
    this.loading = false;
    this.merging = false;
    this.validationErrors = {};
    this.showValidationMessages = false;
  }

}
