import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
/** Page Suivi Commande. @author Francis AHONSU */
@Component({ selector: 'app-order-tracking', standalone: true, imports: [CommonModule, IonicModule, RouterModule], template: `
<ion-header class="ion-no-border"><ion-toolbar><ion-buttons slot="start"><ion-back-button></ion-back-button></ion-buttons><ion-title>Suivi commande</ion-title></ion-toolbar></ion-header>
<ion-content class="page-content"><div class="page-inner"><p class="hint">TODO: Suivi commande</p></div></ion-content>`,
styles: [`.page-content{--background:#FAF6EE}.page-inner{padding:16px}ion-toolbar{--background:#fff;--color:#0D1B2A}.hint{color:#94A3B8;text-align:center;padding:40px 0}`] })
export class OrderTrackingPage {}
