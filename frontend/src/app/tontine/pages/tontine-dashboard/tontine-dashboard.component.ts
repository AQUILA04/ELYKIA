import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Observable, Subject, finalize } from 'rxjs';
import { takeUntil, map, switchMap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TontineService } from '../../services/tontine.service';
import { TontineSessionService } from '../../services/tontine-session.service';
import { TontineMemberFilterStorageService } from '../../services/tontine-member-filter-storage.service';
import {
  TontineMember,
  TontineState,
  TontineSession,
  KPICardConfig,
  TontineMemberDeliveryStatus, // Updated enum import
  TontineSessionStatus, // Added session status enum import
  TontineMemberQueryParams, // New import
  TontineFilterBarParams, // New import
  PaginatedResponse, // New import
  TONTINE_CONSTANTS // New import
} from '../../types/tontine.types';
import { AddMemberModalComponent } from '../../components/modals/add-member-modal/add-member-modal.component';
import { SessionSettingsModalComponent } from '../../components/modals/session-settings-modal/session-settings-modal.component';
import { AddMultipleMembersModalComponent } from '../../components/modals/add-multiple-members-modal/add-multiple-members-modal.component';
import { UserService } from "../../../user/service/user.service";
import { UserProfile } from "../../../shared/models/user-profile.enum";
import { NgxPermissionsService } from 'ngx-permissions';
import { AlertService } from 'src/app/shared/service/alert.service';
import { ClientService } from 'src/app/client/service/client.service';
import { CollectorAssignmentPermissions } from 'src/app/shared/constants/collector-assignment-permission.constant';

@Component({
  selector: 'app-tontine-dashboard',
  templateUrl: './tontine-dashboard.component.html',
  styleUrls: ['./tontine-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TontineDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  /** Cancels in-flight member list requests when a newer filter/page is requested. */
  private readonly membersReload$ = new Subject<TontineMemberQueryParams>();
  /** Cancels in-flight KPI requests when commercial/session changes. */
  private readonly kpiReload$ = new Subject<{ sessionId?: number; commercial?: string }>();
  private dateIntervalId?: ReturnType<typeof setInterval>;

  currentDate = new Date();
  lastUpdate = new Date();

  state$: Observable<TontineState>;
  kpiCards$!: Observable<KPICardConfig[]>;
  currentSession$: Observable<TontineSession | null>;

  memberQueryParams: TontineMemberQueryParams = { page: 0, size: TONTINE_CONSTANTS.DEFAULT_PAGE_SIZE, sort: 'id,asc' };
  initialFilters: TontineFilterBarParams | null = null;
  paginatedMembers: PaginatedResponse<TontineMember> | null = null;
  loadingMembers: boolean = false; // Separate loading state for members table

  isHistoricalView = false;
  showHistoricalAlertMessage = false;
  isRecoveryManager = false;
  isPromoter = false;
  exportingPdf = false;
  exportingCarnetPdf = false;
  canVerify = false;
  canAssignCollector = false;
  showBulkAssignCollectorModal = false;
  selectedTontineCollector = '';
  assigningCollector = false;
  collectors: any[] = [];
  selectedMemberIds = new Set<number>();
  verifyingBulk = false;

  get canSelectMembers(): boolean {
    return (this.canVerify || this.canAssignCollector) && !this.isHistoricalView;
  }

  constructor(
    public readonly tontineService: TontineService,
    private readonly sessionService: TontineSessionService,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly userService: UserService,
    private readonly permissionsService: NgxPermissionsService,
    private readonly alertService: AlertService,
    private readonly clientService: ClientService,
    private readonly filterStorage: TontineMemberFilterStorageService
  ) {
    this.state$ = this.tontineService.state$;
    this.currentSession$ = this.sessionService.currentSession$;
  }

  ngOnInit(): void {
    this.restoreSavedFilters();
    this.setupObservables();
    this.loadCurrentSessionAndMembers();
    this.isRecoveryManager = this.userService.hasProfile(UserProfile.RECOVERY_MANAGER);
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    void this.permissionsService.hasPermission(['ROLE_TONTINE_CARNET_VERIFY', 'ROLE_ADMIN']).then((has) => {
      this.canVerify = !!has;
    });
    void this.permissionsService.hasPermission([CollectorAssignmentPermissions.Client, 'ROLE_ADMIN']).then((has) => {
      this.canAssignCollector = !!has;
    });
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
    this.membersReload$.complete();
    this.kpiReload$.complete();
  }

  private restoreSavedFilters(): void {
    const saved = this.filterStorage.load();
    this.initialFilters = saved;
    if (!saved) {
      return;
    }
    this.memberQueryParams = {
      ...this.memberQueryParams,
      search: saved.search,
      deliveryStatus: saved.deliveryStatus === 'ALL' ? undefined : saved.deliveryStatus,
      commercial: saved.commercial || undefined,
      carnetVerified: typeof saved.carnetVerified === 'boolean' ? saved.carnetVerified : undefined,
      registrationSource: saved.registrationSource || undefined,
      page: 0
    };
  }

  refreshData(): void {
    this.tontineService.getCurrentSession().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.loadMembers();
        this.refreshKpis();
        this.lastUpdate = new Date();
      },
      error: () => {
        this.showError('Erreur lors de l\'actualisation');
      }
    });
  }

  private setupObservables(): void {
    this.kpiCards$ = this.state$.pipe(
      map(state => this.createKPICards(state))
    );

    this.membersReload$.pipe(
      switchMap((params) => {
        this.loadingMembers = true;
        return this.tontineService.getMembers(params).pipe(
          finalize(() => this.loadingMembers = false)
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.data) {
          this.paginatedMembers = response.data as PaginatedResponse<TontineMember>;
          this.lastUpdate = new Date();
        }
      },
      error: () => {
        this.showError('Erreur lors du chargement des membres');
      }
    });

    this.kpiReload$.pipe(
      switchMap(({ sessionId, commercial }) => {
        const id = sessionId
          ?? this.tontineService.getCurrentState().currentSession?.id
          ?? this.sessionService.getCurrentSession()?.id;
        if (!id) {
          return EMPTY;
        }
        return this.tontineService.getSessionStats(id, commercial);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      error: () => {
        this.showError('Erreur lors du chargement des indicateurs');
      }
    });
  }

  private loadCurrentSessionAndMembers(): void {
    this.tontineService.getCurrentSession().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.loadMembers();
        this.refreshKpis();
      },
      error: () => {
        this.showError('Erreur lors du chargement de la session actuelle');
      }
    });
  }

  loadMembers(): void {
    // Snapshot params so switchMap cancels stale requests with the right filter
    this.membersReload$.next({ ...this.memberQueryParams });
  }

  private refreshKpis(sessionId?: number, commercial?: string): void {
    this.kpiReload$.next({
      sessionId,
      commercial: commercial !== undefined ? commercial : this.memberQueryParams.commercial
    });
  }


  private createKPICards(state: TontineState): KPICardConfig[] {
    const kpis = state.kpis;
    const session = state.currentSession;

    if (!kpis) {
      return [
        { title: 'Membres Actifs', value: 0, icon: 'people', color: 'primary' },
        { title: 'Montant Total Collecté', value: '0 XOF', icon: 'account_balance_wallet', color: 'success' },
        { title: 'Revenu Total', value: '0 XOF', icon: 'monetization_on', color: 'accent' },
        { title: 'En Attente de Livraison', value: 0, icon: 'schedule', color: 'warning' },
        { title: 'Contribution Moyenne', value: '0 XOF', icon: 'trending_up', color: 'info' },
        { title: 'Collectes à la livraison', value: '0 XOF', icon: 'local_shipping', color: 'primary' }
      ];
    }

    return [
      {
        title: 'Membres Actifs',
        value: kpis.totalMembers,
        icon: 'people',
        color: 'primary',
        subtitle: 'Inscrits cette année'
      },
      {
        title: 'Montant Total Collecté',
        value: `${kpis.totalCollected.toLocaleString('fr-FR')} XOF`,
        icon: 'account_balance_wallet',
        color: 'success',
        subtitle: 'Épargne totale'
      },
      {
        title: 'Revenu Total',
        value: `${(kpis.totalRevenue ?? session?.totalRevenue ?? 0).toLocaleString('fr-FR')} XOF`,
        icon: 'monetization_on',
        color: 'accent',
        subtitle: 'Part société'
      },
      {
        title: 'En Attente de Livraison',
        value: kpis.pendingDeliveries,
        icon: 'schedule',
        color: 'warning',
        subtitle: `${kpis.completedDeliveries} livrés`
      },
      {
        title: 'Contribution Moyenne',
        value: `${Math.round(kpis.averageContribution).toLocaleString('fr-FR')} XOF`,
        icon: 'trending_up',
        color: 'info',
        subtitle: 'Par membre'
      },
      {
        title: 'Collectes à la livraison',
        value: `${(kpis.totalDeliveryCollections || 0).toLocaleString('fr-FR')} XOF`,
        icon: 'local_shipping',
        color: 'primary',
        subtitle: 'Lors de la livraison'
      }
    ];
  }

  onFilterChange(params: TontineFilterBarParams): void {
    const previousCommercial = this.memberQueryParams.commercial;
    const nextCommercial = params.commercial || undefined;
    this.memberQueryParams = {
      ...this.memberQueryParams,
      search: params.search,
      deliveryStatus: params.deliveryStatus === 'ALL' ? undefined : params.deliveryStatus,
      commercial: nextCommercial,
      carnetVerified: typeof params.carnetVerified === 'boolean' ? params.carnetVerified : undefined,
      registrationSource: params.registrationSource || undefined,
      page: 0 // Reset to first page on new filter/search
    };
    this.filterStorage.save(params);
    this.selectedMemberIds = new Set();
    this.loadMembers();
    // Always reload KPIs when commercial changes (including clear → global)
    if (previousCommercial !== nextCommercial) {
      this.refreshKpis(undefined, nextCommercial);
    }
  }

  onExportCommercialPdf(commercial: string): void {
    if (!commercial || this.exportingPdf) {
      return;
    }
    this.exportingPdf = true;
    this.tontineService.exportCommercialMembersPdf(commercial).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.exportingPdf = false)
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        const safeCommercial = commercial.replace(/[^a-zA-Z0-9_-]/g, '_');
        anchor.download = `membres_tontine_${safeCommercial}_${new Date().toISOString().slice(0, 10)}.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        this.showSuccess('PDF téléchargé avec succès');
      },
      error: () => {
        this.showError('Erreur lors du téléchargement du PDF');
      }
    });
  }

  onExportCarnetPdf(event: { verified: boolean; commercial?: string }): void {
    if (this.exportingCarnetPdf) {
      return;
    }
    this.exportingCarnetPdf = true;
    this.tontineService.exportCarnetVerificationPdf(event.verified, event.commercial).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.exportingCarnetPdf = false)
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        const statusPart = event.verified ? 'verifies' : 'a_verifier';
        const commercialPart = event.commercial ? event.commercial.replace(/[^a-zA-Z0-9_-]/g, '_') : 'tous';
        anchor.download = `carnets_${statusPart}_${commercialPart}_${new Date().toISOString().slice(0, 10)}.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        this.showSuccess('PDF téléchargé avec succès');
      },
      error: () => {
        this.showError('Erreur lors du téléchargement du PDF de vérification');
      }
    });
  }

  onSelectionChange(ids: Set<number>): void {
    this.selectedMemberIds = ids;
  }

  clearSelection(): void {
    this.selectedMemberIds = new Set();
  }

  onBulkVerify(): void {
    if (this.verifyingBulk || this.selectedMemberIds.size === 0 || this.isHistoricalView) {
      return;
    }
    const ids = Array.from(this.selectedMemberIds);
    void this.alertService.showConfirmation(
      'Vérifier les carnets',
      `Marquer ${ids.length} membre(s) comme vérifiés ?`,
      'Vérifier'
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.verifyingBulk = true;
      this.tontineService.bulkSetMemberCarnetVerification(ids, true).pipe(
        takeUntil(this.destroy$),
        finalize(() => this.verifyingBulk = false)
      ).subscribe({
        next: (response) => {
          const updated = response.data?.updated ?? ids.length;
          this.showSuccess(`${updated} carnet(s) marqué(s) comme vérifié(s)`);
          this.selectedMemberIds = new Set();
          this.loadMembers();
        },
        error: (err) => {
          this.showError(err?.message || 'Erreur lors de la vérification en masse');
        }
      });
    });
  }

  openBulkAssignCollectorModal(): void {
    if (this.selectedMemberIds.size === 0) {
      this.alertService.showWarning('Veuillez sélectionner au moins un membre.');
      return;
    }
    this.loadCollectors();
    this.showBulkAssignCollectorModal = true;
  }

  closeBulkAssignCollectorModal(): void {
    this.showBulkAssignCollectorModal = false;
    this.selectedTontineCollector = '';
  }

  confirmBulkAssignCollector(): void {
    if (!this.selectedTontineCollector) {
      this.alertService.showWarning('Veuillez sélectionner un commercial.');
      return;
    }

    const selectedMembersList = (this.paginatedMembers?.content || [])
      .filter(m => this.selectedMemberIds.has(m.id));

    const allAlreadyAssigned = selectedMembersList.length > 0 &&
      selectedMembersList.every(m => m.client?.tontineCollector === this.selectedTontineCollector);

    if (allAlreadyAssigned) {
      this.alertService.showWarning('Le commercial sélectionné est déjà assigné aux membres choisis.');
      return;
    }

    this.assigningCollector = true;
    this.tontineService.bulkAssignCollector(
      Array.from(this.selectedMemberIds),
      this.selectedTontineCollector
    ).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.assigningCollector = false)
    ).subscribe({
      next: () => {
        this.alertService.showSuccess('Changement de commercial tontine effectué avec succès.');
        this.closeBulkAssignCollectorModal();
        this.selectedMemberIds = new Set();
        this.loadMembers();
      },
      error: (error) => {
        this.alertService.showError(error?.message || 'Erreur lors du changement de commercial tontine.');
      }
    });
  }

  private loadCollectors(): void {
    if (this.collectors.length > 0) {
      return;
    }
    this.clientService.getAgents().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.collectors = data || [];
      },
      error: (error) => {
        console.error('Erreur lors du chargement des commerciaux', error);
      }
    });
  }

  onPageChange(event: { page: number, size: number }): void {
    this.memberQueryParams = {
      ...this.memberQueryParams,
      page: event.page,
      size: event.size
    };
    this.loadMembers();
  }

  onSortChange(sortString: string): void {
    this.memberQueryParams = {
      ...this.memberQueryParams,
      sort: sortString,
      page: 0 // Reset to first page on new sort
    };
    this.loadMembers();
  }


  onMemberClick(member: TontineMember): void {
    this.router.navigate(['/tontine/member', member.id]);
  }

  openAddMemberModal(): void {
    const dialogRef = this.dialog.open(AddMemberModalComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMembers(); // Use loadMembers after adding a member
        this.showSuccess('Membre ajouté avec succès');
      }
    });
  }

  openSessionSettings(): void {
    const currentSession = this.tontineService.getCurrentState().currentSession;
    const dialogRef = this.dialog.open(SessionSettingsModalComponent, {
      width: '500px',
      data: { session: currentSession }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showSuccess('Session mise à jour avec succès');
      }
    });
  }

  openAddMultipleMembersModal(): void {
    const dialogRef = this.dialog.open(AddMultipleMembersModalComponent, {
      width: '700px',
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMembers();
        this.showSuccess('Membres ajoutés avec succès');
      }
    });
  }

  onSessionChange(session: TontineSession): void {
    this.isHistoricalView = session.status !== TontineSessionStatus.ACTIVE;
    this.showHistoricalAlertMessage = this.isHistoricalView && session.status === TontineSessionStatus.ENDED;
    // Keep filters; only reset pagination when switching session
    this.memberQueryParams = {
      ...this.memberQueryParams,
      page: 0
    };
    this.loadMembers();
    this.refreshKpis(session.id, this.memberQueryParams.commercial);
  }

  navigateToComparison(): void {
    this.router.navigate(['/tontine/compare']);
  }

  returnToCurrentSession(): void {
    this.tontineService.getCurrentSession().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.data) {
          this.onSessionChange(response.data);
        }
      }
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
