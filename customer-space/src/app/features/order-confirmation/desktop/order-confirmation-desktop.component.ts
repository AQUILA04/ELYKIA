
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ElykDesktopPageComponent } from '../../../shared/ui';

@Component({
  selector: 'app-order-confirmation-desktop',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, ElykDesktopPageComponent],
  template: `
    <app-elyk-desktop-page eyebrow="COMMANDE" title="Commande confirmée" subtitle="Votre demande a bien été enregistrée" data-testid="e2e-order-confirmation-desktop">
      <div class="desk-card success-card">
        <div class="success-icon"><ion-icon name="checkmark-circle-outline"></ion-icon></div>
        <h2>Merci pour votre commande</h2>
        <p class="desk-muted">Référence : <strong>{{ reference() }}</strong></p>
        <p class="desk-muted" style="margin-bottom:20px;">Montant : <strong>{{ totalAmount() | number:'1.0-0' }} FCFA</strong></p>
        <div class="desk-actions" style="max-width:320px;margin:0 auto;">
          <ion-button expand="block" class="elyk-btn-gold" routerLink="/purchases">Voir mes achats</ion-button>
          <ion-button expand="block" fill="outline" class="elyk-btn-outline" routerLink="/dashboard">Retour à l'accueil</ion-button>
        </div>
      </div>
    </app-elyk-desktop-page>
  `,
  styles: [`
    :host { display:block; }
    .desk-card { background:var(--elyk-white); border-radius:var(--elyk-radius-card); box-shadow:var(--elyk-shadow-soft); padding:24px; }
    .success-card { text-align:center; max-width:520px; margin:40px auto; }
    .success-icon { font-size:64px; color:var(--elyk-green); }
    .desk-muted { color:var(--elyk-gray-text); font-size:14px; }
    .desk-actions { display:flex; flex-direction:column; gap:10px; }
  `],
})
export class OrderConfirmationDesktopComponent {
  readonly reference = input('');
  readonly totalAmount = input(0);
}
