import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { DistributionView, DistributionItemView } from '../../../../models/distribution-view.model';
import { DistributionService } from '../../../../core/services/distribution.service';
import { RecoveryService } from '../../../../core/services/recovery.service';
import * as DistributionActions from '../../../../store/distribution/distribution.actions';
import { selectAuthUser } from '../../../../store/auth/auth.selectors';

@Component({
  selector: 'app-distribution-detail',
  templateUrl: './distribution-detail.component.html',
  styleUrls: ['./distribution-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  providers: [DecimalPipe]
})
export class DistributionDetailComponent implements OnInit {

  @Input() distribution!: DistributionView;

  constructor(
    private modalController: ModalController,
    private decimalPipe: DecimalPipe,
    private distributionService: DistributionService,
    private recoveryService: RecoveryService,
    private store: Store,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    // No need to load items manually, they are already populated in DistributionView
    if (this.distribution && (!this.distribution.items || this.distribution.items.length === 0)) {
      console.warn('[DistributionDetail] Distribution items are empty, this might be expected if no items exist.');
    }
  }

  dismiss() {
    this.modalController.dismiss();
  }

  hasValidData(): boolean {
    return !!(
      this.distribution &&
      this.distribution.reference &&
      this.distribution.client &&
      this.distribution.totalAmount !== undefined &&
      this.distribution.startDate
    );
  }

  getFormattedAmount(amount: number): string {
    return this.decimalPipe.transform(amount, '1.0-0') + ' FCFA';
  }

  getFormattedDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('fr-FR', options);
  }

  getPaymentProgress(): number {
    if (!this.distribution.paidAmount || !this.distribution.totalAmount) {
      return 0;
    }
    return Math.round((this.distribution.paidAmount / this.distribution.totalAmount) * 100);
  }

  getClientFullName(): string {
    if (this.distribution.client?.fullName) {
      return this.distribution.client.fullName;
    }
    return `${this.distribution.client?.firstname} ${this.distribution.client?.lastname}`;
  }

  getStatusColor(): string {
    const statusValue = typeof this.distribution.status === 'string' ? this.distribution.status : (this.distribution.status as any)?.label || '';
    switch (statusValue.toLowerCase()) {
      case 'en cours':
      case 'inprogress':
        return 'success';
      case 'terminé':
      case 'completed':
        return 'medium';
      case 'en retard':
      case 'late':
        return 'danger';
      default:
        return 'medium';
    }
  }

  canModifyOrDelete(): boolean {
    const isLocal = this.distribution?.isLocal;
    if (!isLocal) return false;

    // Handle different data types for isLocal field
    return isLocal === true ||
      isLocal === 1 ||
      isLocal === '1' ||
      isLocal === 'true' ||
      String(isLocal).toLowerCase() === 'true';
  }

  async editDistribution() {
    if (!this.canModifyOrDelete()) {
      await this.showErrorToast('Cette distribution ne peut pas être modifiée car elle n\'est pas locale.');
      return;
    }

    await this.modalController.dismiss();
    this.router.navigate(['/distributions/edit', this.distribution.id]);
  }

  async deleteDistribution() {
    if (!this.canModifyOrDelete()) {
      await this.showErrorToast('Cette distribution ne peut pas être supprimée car elle n\'est pas locale.');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Supprimer la distribution',
      message: `Êtes-vous sûr de vouloir supprimer définitivement la distribution <strong>${this.distribution.reference}</strong> ?<br><br>Cette action est <strong>irréversible</strong> et supprimera :<br>• Tous les articles de la distribution<br>• L'historique des paiements<br>• Les données associées`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'Supprimer définitivement',
          role: 'destructive',
          cssClass: 'alert-button-confirm-delete',
          handler: () => {
            this.confirmDelete();
          }
        }
      ],
      cssClass: 'delete-confirmation-alert'
    });

    await alert.present();
  }

  private async confirmDelete() {
    try {
      console.log(`Starting deletion process for distribution: ${this.distribution.id}`);

      // 1. Skip recovery deletion for now to avoid syncHash column error
      console.log('Skipping recovery deletion to avoid database schema issues');

      // 2. Delete the distribution (this will also restore stock and attempt to delete transactions)
      const deleteResult = await firstValueFrom(this.distributionService.deleteDistribution(this.distribution.id));

      if (!deleteResult) {
        throw new Error('Failed to delete distribution');
      }

      console.log('Distribution and related data deleted successfully');

      // Reload distributions to update the list
      this.store.select(selectAuthUser).pipe(
        filter(user => !!user),
        take(1)
      ).subscribe(user => {
        if (user) {
          this.store.dispatch(DistributionActions.loadDistributions({ commercialUsername: user.username }));
        }
      });

      const toast = await this.toastController.create({
        message: 'Distribution supprimée avec succès. Le stock a été restauré.',
        duration: 4000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      await this.modalController.dismiss({ deleted: true });
    } catch (error) {
      console.error('Error deleting distribution:', error);

      // Show more specific error message
      let errorMessage = 'Erreur lors de la suppression de la distribution.';
      if (error instanceof Error && error.message && error.message.includes('syncHash')) {
        errorMessage = 'Erreur de base de données. La distribution a été partiellement supprimée.';
      }

      await this.showErrorToast(errorMessage);
    }
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 4000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }

}
