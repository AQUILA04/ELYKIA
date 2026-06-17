import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CustomerSessionService } from '../../services/customer-session.service';
/** Page Profil Client. @author Francis AHONSU */
@Component({ selector: 'app-customer-profile', standalone: true, imports: [CommonModule, IonicModule, RouterModule], template: `<ion-header><ion-toolbar color="primary"><ion-title>Mon Profil</ion-title></ion-toolbar></ion-header><ion-content ion-padding><p>{{ session?.fullName }}</p><p>{{ session?.phone }}</p><ion-button expand="block" color="danger" (click)="logout()">Se déconnecter</ion-button></ion-content>` })
export class CustomerProfilePage {
  session = this.sessionService.currentSession;
  constructor(private sessionService: CustomerSessionService, private router: RouterModule) {}
  logout(): void { this.sessionService.clearSession(); }
}
