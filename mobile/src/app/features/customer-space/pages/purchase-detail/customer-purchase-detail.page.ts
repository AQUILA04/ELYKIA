import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
/** Page Détail d'un Achat — S-05. @author Francis AHONSU */
@Component({ selector: 'app-customer-purchase-detail', standalone: true, imports: [CommonModule, IonicModule, RouterModule], template: `<ion-header><ion-toolbar color="primary"><ion-buttons slot="start"><ion-back-button defaultHref="/customer/purchases"></ion-back-button></ion-buttons><ion-title>Détail de l'achat</ion-title></ion-toolbar></ion-header><ion-content><p>TODO: Détail achat S-05</p></ion-content>` })
export class CustomerPurchaseDetailPage {}
