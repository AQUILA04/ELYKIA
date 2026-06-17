import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
/** Page Confirmation Commande — S-11. @author Francis AHONSU */
@Component({ selector: 'app-customer-order-confirmation', standalone: true, imports: [CommonModule, IonicModule, RouterModule], template: `<ion-header><ion-toolbar color="primary"><ion-title>Commande passée</ion-title></ion-toolbar></ion-header><ion-content class="ion-text-center ion-padding"><ion-icon name="bag-check-outline" style="font-size:80px;color:#C9922A"></ion-icon><h2>Commande soumise !</h2><p>Votre commande est en attente de validation par l'agence.</p><ion-button expand="block" routerLink="/customer/dashboard">Retour à l'accueil</ion-button></ion-content>` })
export class CustomerOrderConfirmationPage {}
