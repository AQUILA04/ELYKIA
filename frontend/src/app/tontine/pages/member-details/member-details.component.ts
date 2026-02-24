import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TontineService } from '../../services/tontine.service';
import { TontineDeliveryService } from '../../services/tontine-delivery.service';
import {
  TontineMember,
  TontineCollection,
  CreateDeliveryDto,
  formatCurrency,
  formatDateTime,
  TontineMemberDeliveryStatus,
  TontineSessionStatus,
  TONTINE_DELIVERY_STATUS_LABELS,
  TONTINE_DELIVERY_STATUS_COLORS
} from '../../types/tontine.types';
import { AuthService } from 'src/app/auth/service/auth.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { RecordCollectionModalComponent } from '../../components/modals/record-collection-modal/record-collection-modal.component';
import { DeliveryArticleSelectionModalComponent } from '../../components/modals/delivery-article-selection-modal/delivery-article-selection-modal.component';
import { AddMemberModalComponent } from '../../components/modals/add-member-modal/add-member-modal.component';

@Component({
  selector: 'app-member-details',
  templateUrl: './member-details.component.html',
  styleUrls: ['./member-details.component.scss']
})
export class MemberDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  member: TontineMember | null = null;
  collections: readonly TontineCollection[] = [];
  loading: boolean = false;
  currentSessionStatus: TontineSessionStatus | null = null;
  isSessionActive: boolean = false;

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
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    const memberId = Number(this.route.snapshot.paramMap.get('id'));
    if (memberId) {
      this.loadMemberDetails(memberId);
      this.loadCollections(memberId);
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMemberDetails(memberId: number): void {
    this.loading = true;
    this.tontineService.getMemberById(memberId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.data) {
          this.member = response.data;
          // Charger la livraison si le membre est livré
          if (this.member && this.member.deliveryStatus !== TontineMemberDeliveryStatus.SESSION_INPROGRESS) {
            this.loadDelivery(memberId);
          }
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
      error: (err) => {
        console.log('No delivery found or error loading delivery:', err);
      }
    });
  }

  private loadCollections(memberId: number): void {
    this.tontineService.getCollections(memberId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.data) {
          this.collections = response.data.content;
        }
      },
      error: () => {
        this.showError('Erreur lors du chargement de l\'historique');
      }
    });
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

  // Helper methods for status display in template
  getStatusLabel(status: TontineMemberDeliveryStatus): string {
    return TONTINE_DELIVERY_STATUS_LABELS[status] || status;
  }

  getStatusColor(status: TontineMemberDeliveryStatus): string {
    return TONTINE_DELIVERY_STATUS_COLORS[status] || 'secondary';
  }

  // Calculate theoretical society share due
  getTheoreticalSocietyShare(): number {
    if (!this.member || !this.member.tontineSession) return 0;

    const dailyAmount = this.member.amount ?? 0;
    const startDateStr = this.member.tontineSession.startDate;
    const registrationDateStr = this.member.registrationDate;

    if (!startDateStr) return 0;

    let startDate = new Date(startDateStr);
    const now = new Date();

    // Logic to use registration date if it's later than session start
    if (registrationDateStr) {
      const regDate = new Date(registrationDateStr);
      if (regDate > startDate) {
        startDate = regDate;
      }
    }

    let monthsStarted = 0;
    if (now >= startDate) {
      monthsStarted = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1;
    }

    const MAX_MONTHS = 10;
    if (monthsStarted > MAX_MONTHS) monthsStarted = MAX_MONTHS;
    if (monthsStarted < 0) monthsStarted = 0;

    return monthsStarted * dailyAmount;
  }

  getSocietyShareStatusColor(): string {
    const paid = this.member?.societyShare || 0;
    const due = this.getTheoreticalSocietyShare();
    return paid < due ? 'warn' : 'primary';
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
        this.showSuccess('Collecte enregistrée avec succès');
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
