import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
/** Page Panier — S-10. @author Francis AHONSU */
@Component({ selector: 'app-customer-cart', standalone: true, imports: [CommonModule, IonicModule, RouterModule], template: `<ion-header><ion-toolbar color="primary"><ion-buttons slot="start"><ion-back-button defaultHref="/customer/catalog"></ion-back-button></ion-buttons><ion-title>Mon Panier</ion-title></ion-toolbar></ion-header><ion-content><p>TODO: Panier S-10</p></ion-content><ion-footer><ion-toolbar><ion-button expand="block" color="primary" routerLink="/customer/order-confirmation">Passer la commande</ion-button></ion-toolbar></ion-footer>` })
export class CustomerCartPage {}
