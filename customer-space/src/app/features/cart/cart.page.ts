import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
/** Page Panier — S-10. @author Francis AHONSU */
@Component({ selector: 'app-cart', standalone: true, imports: [CommonModule, IonicModule, RouterModule], template: `
<ion-header class="ion-no-border"><ion-toolbar><ion-buttons slot="start"><ion-back-button defaultHref="/catalog"></ion-back-button></ion-buttons><ion-title>Mon Panier</ion-title></ion-toolbar></ion-header>
<ion-content class="page-content"><div class="page-inner"><p class="empty-hint">TODO: Affichage du panier (S-10)</p></div></ion-content>
<ion-footer><ion-toolbar><ion-button expand="block" routerLink="/order-confirmation">Passer la commande</ion-button></ion-toolbar></ion-footer>`,
styles: [`.page-content{--background:#FAF6EE}.page-inner{padding:16px}ion-toolbar{--background:#fff;--color:#0D1B2A}.empty-hint{color:#94A3B8;text-align:center;padding:40px 0}ion-button{--border-radius:12px;--background:#C9922A;font-weight:600}`] })
export class CartPage {}
