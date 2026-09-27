import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CustomerNotificationInboxService } from '../../services/customer-notification-inbox.service';

/** Bouton cloche + badge non-lus — Accueil / Profil. */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
})
export class NotificationBellComponent {
  @Input() testId = 'e2e-notification-bell';

  constructor(readonly inbox: CustomerNotificationInboxService) {}
}
