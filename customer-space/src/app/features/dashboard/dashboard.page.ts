import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertController, IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import { AppUpdateService } from '../../shared/services/app-update.service';
import { CustomerDashboard } from '../../shared/models/customer.model';
import { AppReleaseInfo } from '../../shared/models/app-release.model';
import { CreditProgressCardComponent } from '../../shared/components/credit-progress-card/credit-progress-card.component';
import { CustomerTabBarComponent } from '../../shared/layout/customer-tab-bar/customer-tab-bar.component';
import { environment } from '../../../environments/environment';

/** Page Tableau de Bord — S-03. */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, CreditProgressCardComponent, CustomerTabBarComponent],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  dashboard: CustomerDashboard | null = null;
  isLoading = true;
  loadError = false;
  canPayNext = false;
  paymentQueryParams: Record<string, number> | null = null;
  appVersion = environment.version;
  updateInProgress = false;

  constructor(
    private api: CustomerApiService,
    private session: CustomerSessionService,
    private appUpdateService: AppUpdateService,
    private alertController: AlertController,
  ) {}

  get displayName(): string {
    return this.dashboard?.fullName
      ?? this.session.currentSession?.fullName
      ?? '';
  }

  get creditReference(): string {
    const count = this.dashboard?.activeCreditCount ?? 0;
    return count === 1 ? '1 crédit actif' : `${count} crédits actifs`;
  }

  get formattedNextDate(): string {
    if (!this.dashboard?.nextPaymentDate) return '';
    const d = new Date(this.dashboard.nextPaymentDate);
    return Number.isNaN(d.getTime())
      ? this.dashboard.nextPaymentDate
      : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private applyPaymentState(dashboard: CustomerDashboard): void {
    const canPay = !!(
      dashboard.nextPaymentCreditId
      && dashboard.nextPaymentAmount > 0
      && (dashboard.nextInstallmentNumber ?? 0) > 0
    );
    this.canPayNext = canPay;
    this.paymentQueryParams = canPay
      ? {
          amount: dashboard.nextPaymentAmount,
          installment: dashboard.nextInstallmentNumber ?? 0,
        }
      : null;
  }

  ngOnInit(): void {
    this.loadDashboard();
    void this.checkForAppUpdateOnDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.loadError = false;
    this.canPayNext = false;
    this.paymentQueryParams = null;
    this.api.getDashboard().subscribe({
      next: (d) => {
        this.dashboard = d;
        this.applyPaymentState(d);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = true;
      },
    });
  }

  private async checkForAppUpdateOnDashboard(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      return;
    }

    try {
      const release = await this.appUpdateService.checkForUpdate();
      if (!release.updateAvailable) {
        return;
      }

      const confirmed = await this.promptAppUpdate(release);
      if (!confirmed) {
        return;
      }

      this.updateInProgress = true;
      await this.appUpdateService.downloadAndInstall(release);
    } catch {
      // Silently ignore update check failures on dashboard boot
    } finally {
      this.updateInProgress = false;
    }
  }

  private async promptAppUpdate(release: AppReleaseInfo): Promise<boolean> {
    const mandatory = release.updateRequired || release.mandatory;
    const sizeMb = release.sizeBytes > 0
      ? (release.sizeBytes / (1024 * 1024)).toFixed(1)
      : null;
    const sizeLine = sizeMb ? `\n\nTaille : ${sizeMb} Mo` : '';
    const notes = release.releaseNotes?.trim()
      ? `\n\n${release.releaseNotes.trim()}`
      : '';

    return new Promise<boolean>((resolve) => {
      void this.alertController.create({
        header: mandatory ? 'Mise à jour obligatoire' : 'Mise à jour disponible',
        message: `Version ${release.version} disponible (vous êtes en ${this.appVersion}).${sizeLine}${notes}`,
        backdropDismiss: !mandatory,
        buttons: mandatory
          ? [{ text: 'Mettre à jour', handler: () => resolve(true) }]
          : [
              { text: 'Plus tard', role: 'cancel', handler: () => resolve(false) },
              { text: 'Mettre à jour', handler: () => resolve(true) },
            ],
      }).then((alert) => alert.present());
    });
  }
}
