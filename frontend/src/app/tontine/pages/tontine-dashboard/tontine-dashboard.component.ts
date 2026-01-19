import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, finalize } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TontineService } from '../../services/tontine.service';
import { TontineSessionService } from '../../services/tontine-session.service';
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

@Component({
  selector: 'app-tontine-dashboard',
  templateUrl: './tontine-dashboard.component.html',
  styleUrls: ['./tontine-dashboard.component.scss']
})
export class TontineDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  state$: Observable<TontineState>;
  kpiCards$!: Observable<KPICardConfig[]>;
  currentSession$: Observable<TontineSession | null>;

  memberQueryParams: TontineMemberQueryParams = { page: 0, size: TONTINE_CONSTANTS.DEFAULT_PAGE_SIZE, sort: 'id,asc' };
  paginatedMembers: PaginatedResponse<TontineMember> | null = null;
  loadingMembers: boolean = false; // Separate loading state for members table

  isHistoricalView = false;
  showHistoricalAlertMessage = false;

  constructor(
    private tontineService: TontineService,
    private sessionService: TontineSessionService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.state$ = this.tontineService.state$;
    this.currentSession$ = this.sessionService.currentSession$;
  }

  ngOnInit(): void {
    this.setupObservables();
    this.loadCurrentSessionAndMembers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupObservables(): void {
    this.kpiCards$ = this.state$.pipe(
      map(state => this.createKPICards(state))
    );

    this.tontineService.state$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(state => {
      this.loadingMembers = state.loading;
    });
  }

  private loadCurrentSessionAndMembers(): void {
    this.tontineService.getCurrentSession().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        // Initial load of members for the current session
        this.loadMembers();
      },
      error: (error) => {
        this.showError('Erreur lors du chargement de la session actuelle');
      }
    });
  }

  loadMembers(): void {
    this.loadingMembers = true;
    this.tontineService.getMembers(this.memberQueryParams).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loadingMembers = false)
    ).subscribe({
      next: (response) => {
        if (response.data) {
          this.paginatedMembers = response.data as PaginatedResponse<TontineMember>;
        }
      },
      error: (error) => {
        this.showError('Erreur lors du chargement des membres');
      }
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
        value: `${(session?.totalRevenue || kpis.totalRevenue || 0).toLocaleString('fr-FR')} XOF`,
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
    this.memberQueryParams = {
      ...this.memberQueryParams,
      search: params.search,
      deliveryStatus: params.deliveryStatus === 'ALL' ? undefined : params.deliveryStatus,
      commercial: params.commercial || undefined,
      page: 0 // Reset to first page on new filter/search
    };
    this.loadMembers();
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
    // When session changes, reload members for the new session, resetting filters/pagination
    this.memberQueryParams = { page: 0, size: TONTINE_CONSTANTS.DEFAULT_PAGE_SIZE, sort: 'id,asc' };
    this.loadMembers();
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
