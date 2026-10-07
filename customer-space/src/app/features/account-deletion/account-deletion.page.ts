import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ElykPageHeaderComponent } from '../../shared/ui';
import { CustomerSessionService } from '../../shared/services/customer-session.service';

const SUPPORT_EMAIL = 'support@optimizesolux.com';
const MAIL_SUBJECT = 'Demande de suppression de compte Elykia';
const MAIL_BODY =
  'Bonjour,\n\nJe demande la suppression de mon compte Espace Client Elykia et des données associées.\n\nNuméro de téléphone du compte : \nNom : \n\nMerci.';

/** Demande de suppression de compte — page publique (Play Console et navigateur). */
@Component({
  selector: 'app-account-deletion',
  standalone: true,
  imports: [IonicModule, ElykPageHeaderComponent, RouterLink],
  templateUrl: './account-deletion.page.html',
  styleUrls: ['../privacy/privacy.page.scss'],
})
export class AccountDeletionPage {
  private readonly router = inject(Router);
  private readonly sessionService = inject(CustomerSessionService);

  readonly supportEmail = SUPPORT_EMAIL;

  get mailtoHref(): string {
    const session = this.sessionService.currentSession;
    let body = MAIL_BODY;
    if (session?.phone) {
      body = body.replace('Numéro de téléphone du compte : ', `Numéro de téléphone du compte : ${session.phone}`);
    }
    if (session?.fullName) {
      body = body.replace('Nom : ', `Nom : ${session.fullName}`);
    }
    return (
      `mailto:${SUPPORT_EMAIL}` +
      `?subject=${encodeURIComponent(MAIL_SUBJECT)}` +
      `&body=${encodeURIComponent(body)}`
    );
  }

  goBack(): void {
    if (this.sessionService.isAuthenticated) {
      void this.router.navigate(['/profile']);
      return;
    }
    void this.router.navigate(['/auth']);
  }
}
