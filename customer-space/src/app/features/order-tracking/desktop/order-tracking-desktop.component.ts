
import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ElykDesktopPageComponent } from '../../../shared/ui';

@Component({
  selector: 'app-order-tracking-desktop',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, ElykDesktopPageComponent],
  template: `
    <app-elyk-desktop-page eyebrow="SUIVI" title="Suivi de commande" subtitle="Le détail de livraison sera bientôt disponible" [showBack]="true" (back)="back.emit()" data-testid="e2e-order-tracking-desktop">
      <div class="desk-card success-card">
        <ion-icon name="bicycle-outline" style="font-size:56px;color:var(--elyk-gold);"></ion-icon>
        <h2>Suivi en cours de préparation</h2>
        <p class="desk-muted" style="margin-bottom:20px;">Consultez vos achats pour suivre l'avancement de votre crédit.</p>
        <ion-button expand="block" class="elyk-btn-gold" routerLink="/purchases">Mes achats</ion-button>
      </div>
    </app-elyk-desktop-page>
  `,
  styles: [`
    :host { display:block; }
    .desk-card { background:var(--elyk-white); border-radius:var(--elyk-radius-card); box-shadow:var(--elyk-shadow-soft); padding:24px; }
    .success-card { text-align:center; max-width:520px; margin:40px auto; }
    .desk-muted { color:var(--elyk-gray-text); font-size:14px; }
  `],
})
export class OrderTrackingDesktopComponent {
  readonly back = output<void>();
}
