import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { TontineService } from '../../services/tontine.service';
import { TontineDeliveryService } from '../../services/tontine-delivery.service';
import {
  TontineMember,
  TontineCollection,
  TontineMemberAmountHistory,
  CreateDeliveryDto,
  formatCurrency,
  formatDate,
  formatDateTime,
  TontineMemberDeliveryStatus,
  TontineSessionStatus,
  TONTINE_DELIVERY_STATUS_LABELS,
  TONTINE_DELIVERY_STATUS_COLORS
} from '../../types/tontine.types';
import { collectionEquivalentDays } from '../../utils/tontine-amount-history.util';
import { AuthService } from 'src/app/auth/service/auth.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { RecordCollectionModalComponent } from '../../components/modals/record-collection-modal/record-collection-modal.component';
import { RecordCatchupCollectionModalComponent } from '../../components/modals/record-catchup-collection-modal/record-catchup-collection-modal.component';
import { DeliveryArticleSelectionModalComponent } from '../../components/modals/delivery-article-selection-modal/delivery-article-selection-modal.component';
import { AddMemberModalComponent } from '../../components/modals/add-member-modal/add-member-modal.component';
import { TontineFieldControlModalComponent } from '../../components/modals/tontine-field-control-modal/tontine-field-control-modal.component';
import { UserProfilConstant } from 'src/app/shared/constants/user-profil.constant';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import {
  TontineMemberFieldControlDto
} from '../../models/tontine-member-field-control.model';

/** Mois calendaires de la session tontine (Fév = 1 … Nov = 10, index JS Date.getMonth()). */
const TONTINE_JS_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export interface MonthlyCollectionSummary {
  monthName: string;
  year: number;
  jsMonth: number;
  count: number;
  totalAmount: number;
  equivalentDays: number;
  isCurrent: boolean;
  isFuture: boolean;
}

@Component({
  selector: 'app-member-details',
  templateUrl: './member-details.component.html',
  styleUrls: ['./member-details.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class MemberDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private dateIntervalId?: ReturnType<typeof setInterval>;

  currentDate = new Date();
  lastUpdate = new Date();

  member: TontineMember | null = null;
  amountHistory: TontineMemberAmountHistory[] = [];
  collectionsDataSource = new MatTableDataSource<TontineCollection>([]);
  displayedColumns: string[] = ['date', 'amount', 'commercial', 'consent', 'actions'];
  loadingCollections = false;
  loadingAmountHistory = false;
  loading: boolean = false;
  currentSessionStatus: TontineSessionStatus | null = null;
  isSessionActive: boolean = false;
  isAdmin = false;
  isRecoveryManager = false;
  fieldControlLatest: TontineMemberFieldControlDto | null = null;
  isFieldControlBusy = false;

  monthsList = [
    'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tontineService: TontineService,
    private deliveryService: TontineDeliveryService,
    private dialog: MatDialog,
    private authService: AuthService,
    private alertService: AlertService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const memberId = Number(this.route.snapshot.paramMap.get('id'));
    if (memberId) {
      this.loadMemberDetails(memberId);
      this.loadCollections(memberId);
      this.loadAmountHistory(memberId);
      this.loadFieldControl(memberId);
    }

    // Subscribe to current session status
    this.tontineService.state$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(state => {
      this.currentSessionStatus = state.currentSession?.status || null;
      this.isSessionActive = this.currentSessionStatus === TontineSessionStatus.ACTIVE;
    });

    // Ensure current session is loaded in the service if it's not already
    this.tontineService.getCurrentSession().pipe(takeUntil(this.destroy$)).subscribe();
    this.isAdmin = this.authService.hasRole(UserProfilConstant.ADMIN);
    this.isRecoveryManager = this.userService.hasProfile(UserProfile.RECOVERY_MANAGER);

    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshData(): void {
    if (!this.member) return;
    this.loadMemberDetails(this.member.id);
    this.loadCollections(this.member.id);
    this.loadAmountHistory(this.member.id);
    this.loadFieldControl(this.member.id);
    this.lastUpdate = new Date();
  }

  private loadMemberDetails(memberId: number): void {
    this.loading = true;
    this.tontineService.getMemberById(memberId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.data) {
          this.member = response.data;
          if (this.member && this.member.deliveryStatus !== TontineMemberDeliveryStatus.SESSION_INPROGRESS) {
            this.loadDelivery(memberId);
          } else if (this.member) {
            this.member = { ...this.member, delivery: undefined };
          }
          this.lastUpdate = new Date();
        }
        this.loading = false;
      },
      error: () => {
        this.showError('Erreur lors du chargement des détails');
        this.loading = false;
      }
    });
  }

  private loadDelivery(memberId: number): void {
    this.deliveryService.getDeliveryByMemberId(memberId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.data && this.member) {
          // Ajouter la livraison au membre
          this.member = {
            ...this.member,
            delivery: response.data
          };
        }
      },
      error: () => {
        if (this.member) {
          this.member = { ...this.member, delivery: undefined };
        }
      }
    });
  }

  private loadCollections(memberId: number): void {
    this.loadingCollections = true;
    this.tontineService.getCollections(memberId, 0, 500).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        const content = response.data?.content ?? [];
        this.collectionsDataSource.data = [...content];
        this.loadingCollections = false;
        this.lastUpdate = new Date();
      },
      error: () => {
        this.collectionsDataSource.data = [];
        this.loadingCollections = false;
        this.showError('Erreur lors du chargement de l\'historique');
      }
    });
  }

  private loadAmountHistory(memberId: number): void {
    this.loadingAmountHistory = true;
    this.tontineService.getMemberAmountHistory(memberId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.amountHistory = response.data ?? [];
        this.loadingAmountHistory = false;
      },
      error: () => {
        this.amountHistory = [];
        this.loadingAmountHistory = false;
      }
    });
  }

  private loadFieldControl(memberId: number): void {
    this.tontineService.getLatestMemberFieldControl(memberId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.fieldControlLatest = response?.data || null;
      },
      error: (error) => {
        if (error?.status === 404) {
          this.fieldControlLatest = null;
          return;
        }
        this.fieldControlLatest = null;
      }
    });
  }

  onFieldControl(): void {
    if (!this.member || this.isFieldControlBusy) {
      return;
    }

    this.isFieldControlBusy = true;
    const dialogRef = this.dialog.open(TontineFieldControlModalComponent, {
      width: '760px',
      maxWidth: '95vw',
      data: {
        memberId: this.member.id,
        memberName: this.getClientName(),
        monthlySummaries: this.monthlyCollectionSummaries
      },
      disableClose: true,
      panelClass: 'tontine-field-control-dialog-panel',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((saved?: boolean) => {
      this.isFieldControlBusy = false;
      if (saved && this.member) {
        this.loadFieldControl(this.member.id);
      }
    });
  }

  getFieldControlMonthLabel(month: number): string {
    // calendaire 2–11 → index 0–9 dans monthsList
    const index = month - 2;
    if (index < 0 || index >= this.monthsList.length) {
      return `Mois ${month}`;
    }
    return this.monthsList[index];
  }

  getClientName(): string {
    if (!this.member) return '';
    return `${this.member.client.firstname} ${this.member.client.lastname}`;
  }

  formatCurrency(amount: number): string {
    return formatCurrency(amount);
  }

  formatDateTime(date: string): string {
    return formatDateTime(date);
  }

  formatDateOnly(date: string): string {
    return formatDate(date);
  }

  get sortedAmountHistory(): TontineMemberAmountHistory[] {
    return [...this.amountHistory].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  }

  isActiveAmountHistory(entry: TontineMemberAmountHistory): boolean {
    if (!entry.endDate) {
      return true;
    }
    const end = new Date(entry.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end >= today;
  }

  getAmountHistoryStatusLabel(entry: TontineMemberAmountHistory): string {
    return this.isActiveAmountHistory(entry) ? 'En cours' : 'Clôturé';
  }

  getAmountHistoryStatusClass(entry: TontineMemberAmountHistory): string {
    return this.isActiveAmountHistory(entry) ? 'status-active' : 'status-closed';
  }

  // Helper methods for status display in template
  getStatusLabel(status?: TontineMemberDeliveryStatus): string {
    if (!status) return 'N/A';
    return TONTINE_DELIVERY_STATUS_LABELS[status] || status;
  }

  getStatusColor(status?: TontineMemberDeliveryStatus): string {
    if (!status) return 'secondary';
    return TONTINE_DELIVERY_STATUS_COLORS[status] || 'secondary';
  }

  // Calculate theoretical society share due
  getTheoreticalSocietyShare(): number {
    // if (!this.member || !this.member.tontineSession) return 0;
    //
    // const dailyAmount = this.member.amount ?? 0;
    // const startDateStr = this.member.tontineSession.startDate;
    // const registrationDateStr = this.member.registrationDate;
    //
    // if (!startDateStr) return 0;
    //
    // let startDate = new Date(startDateStr);
    // const now = new Date();
    //
    // // Logic to use registration date if it's later than session start
    // if (registrationDateStr) {
    //   const regDate = new Date(registrationDateStr);
    //   if (regDate > startDate) {
    //     startDate = regDate;
    //   }
    // }
    //
    // let monthsStarted = 0;
    // if (now >= startDate) {
    //   monthsStarted = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1;
    // }
    //
    // const MAX_MONTHS = 10;
    // if (monthsStarted > MAX_MONTHS) monthsStarted = MAX_MONTHS;
    // if (monthsStarted < 0) monthsStarted = 0;
    //

    return ((this.member?.amount ?? 0) * (this.member?.validatedMonths ?? 0)) + ((this.member?.currentMonthDays ?? 0) > 0 ? (this.member?.amount ?? 0) : 0);
  }

  getStatusBadgeClass(status?: TontineMemberDeliveryStatus): string {
    if (!status) return 'status-inprogress';
    const map: Record<string, string> = {
      SESSION_INPROGRESS: 'status-inprogress',
      PENDING: 'status-pending',
      VALIDATED: 'status-validated',
      DELIVERED: 'status-delivered'
    };
    return map[status] || 'status-inprogress';
  }

  getCommercial(): string {
    return this.member?.client?.tontineCollector || '—';
  }

  getInitials(name: string): string {
    if (!name || name === '—') return '?';
    const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getSocietyShareStatusColor(): string {
    const paid = this.member?.societyShare || 0;
    const due = this.getTheoreticalSocietyShare();
    return paid < due ? 'warn' : 'primary';
  }

  get monthlyCollectionSummaries(): MonthlyCollectionSummary[] {
    const sessionYear = this.member?.tontineSession?.year ?? new Date().getFullYear();
    const now = new Date();
    const buckets = new Map<number, { count: number; total: number; equivalentDays: number }>();

    for (const jsMonth of TONTINE_JS_MONTHS) {
      buckets.set(jsMonth, { count: 0, total: 0, equivalentDays: 0 });
    }

    for (const collection of this.collectionsDataSource.data) {
      const date = new Date(collection.collectionDate);
      const jsMonth = date.getMonth();
      if (date.getFullYear() === sessionYear && buckets.has(jsMonth)) {
        const bucket = buckets.get(jsMonth)!;
        bucket.count += 1;
        bucket.total += collection.amount;
        bucket.equivalentDays += this.toEquivalentDaysForCollection(collection);
      }
    }

    return this.monthsList.map((monthName, index) => {
      const jsMonth = TONTINE_JS_MONTHS[index];
      const bucket = buckets.get(jsMonth)!;
      const isCurrent = sessionYear === now.getFullYear() && jsMonth === now.getMonth();
      const isFuture =
        sessionYear > now.getFullYear() ||
        (sessionYear === now.getFullYear() && jsMonth > now.getMonth());

      return {
        monthName,
        year: sessionYear,
        jsMonth,
        count: bucket.count,
        totalAmount: bucket.total,
        equivalentDays: bucket.equivalentDays,
        isCurrent,
        isFuture
      };
    });
  }

  get loadingMonthlySummary(): boolean {
    return this.loadingCollections || this.loadingAmountHistory;
  }

  get canShowEquivalentDays(): boolean {
    return (this.member?.amount ?? 0) > 0 || this.amountHistory.length > 0;
  }

  get memberDailyAmount(): number {
    return this.member?.amount ?? 0;
  }

  toEquivalentDaysForCollection(collection: TontineCollection): number {
    return collectionEquivalentDays(
      collection.amount,
      collection.collectionDate,
      this.amountHistory,
      this.memberDailyAmount
    );
  }

  formatCollectionDaysLabel(days: number): string {
    return days <= 1 ? `${days} jour` : `${days} jours`;
  }

  getDayPastilles(count: number): number[] {
    const total = Math.max(0, Math.floor(count));
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  get monthlyCollectionsTotals(): { count: number; amount: number; equivalentDays: number } {
    return this.monthlyCollectionSummaries.reduce(
      (acc, s) => ({
        count: acc.count + s.count,
        amount: acc.amount + s.totalAmount,
        equivalentDays: acc.equivalentDays + s.equivalentDays
      }),
      { count: 0, amount: 0, equivalentDays: 0 }
    );
  }

  async onValidateDelivery(): Promise<void> {
    if (!this.member?.delivery?.id) return;

    const isConfirmed = await this.alertService.showConfirmation(
      'Confirmation',
      'Êtes-vous sûr de vouloir valider cette livraison ?',
      'Oui',
      'Non'
    );

    if (isConfirmed) {
      this.deliveryService.validateDelivery(this.member.delivery.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.showSuccess('Livraison validée avec succès');
          this.loadMemberDetails(this.member!.id);
        },
        error: (err) => {
          this.showError(err.message || 'Erreur lors de la validation de la livraison');
        }
      });
    }
  }

  onRecordCollection(): void {
    if (!this.member) return;

    const dialogRef = this.dialog.open(RecordCollectionModalComponent, {
      width: '500px',
      data: { member: this.member }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.member) {
        this.loadMemberDetails(this.member.id);
        this.loadCollections(this.member.id);
        this.loadAmountHistory(this.member.id);
        this.showSuccess('Collecte enregistrée avec succès');
      }
    });
  }

  onRecordCatchupCollection(): void {
    if (!this.member) return;

    const dialogRef = this.dialog.open(RecordCatchupCollectionModalComponent, {
      width: '520px',
      panelClass: 'elykia-tontine-dialog',
      data: { member: this.member }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.member) {
        this.loadMemberDetails(this.member.id);
        this.loadCollections(this.member.id);
        this.loadAmountHistory(this.member.id);
        this.showSuccess('Collecte de rattrapage enregistrée avec succès');
      }
    });
  }

  async onCancelCollection(collection: TontineCollection): Promise<void> {
    if (!this.member || !collection?.id) return;

    const confirmed = await this.alertService.showConfirmation(
      'Annulation de collecte',
      'Êtes-vous sûr de vouloir annuler cette collecte ? Cette action corrige les agrégations financières.',
      'Oui, annuler',
      'Non'
    );
    if (!confirmed) return;

    this.tontineService.cancelCollection(collection.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.loadMemberDetails(this.member!.id);
        this.loadCollections(this.member!.id);
        this.loadAmountHistory(this.member!.id);
        this.showSuccess('Collecte annulée avec succès');
      },
      error: (err) => {
        this.showError(err?.message || 'Erreur lors de l’annulation de la collecte');
      }
    });
  }

  onEditMember(): void {
    if (!this.member) return;

    const dialogRef = this.dialog.open(AddMemberModalComponent, {
      width: '500px',
      data: { member: this.member }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.member) {
        this.loadMemberDetails(this.member.id);
        this.loadAmountHistory(this.member.id);
        this.showSuccess('Membre modifié avec succès');
      }
    });
  }

  async onMarkAsDelivered(): Promise<void> {
    if (!this.member?.delivery?.id) return;

    const isConfirmed = await this.alertService.showConfirmation(
      'Confirmation',
      'Êtes-vous sûr de vouloir marquer cette livraison comme livrée ?',
      'Oui',
      'Non'
    );

    if (isConfirmed) {
      this.deliveryService.markDeliveryAsDelivered(this.member.delivery.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.showSuccess('Livraison marquée comme livrée');
          this.loadMemberDetails(this.member!.id);
        },
        error: (err) => {
          this.showError(err.message || 'Erreur lors de la mise à jour du statut de livraison');
        }
      });
    }
  }

  onPrepareDelivery(): void {
    if (!this.member) return;

    const dialogRef = this.dialog.open(DeliveryArticleSelectionModalComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: { member: this.member }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true && this.member) {
        this.showSuccess('Livraison créée avec succès');
        this.loadMemberDetails(this.member!.id);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/tontine']);
  }

  private showSuccess(message: string): void {
    this.alertService.toastSuccess(message, 'Succès');
  }

  private showError(message: string): void {
    this.alertService.toastError(message, 'Erreur');
  }
}

