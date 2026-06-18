import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
/** Page Confirmation Commande — S-11. @author Francis AHONSU */
@Component({ selector: 'app-order-confirmation', standalone: true, imports: [CommonModule, IonicModule, RouterModule], template: `
<ion-header class="ion-no-border"><ion-toolbar><ion-title>Commande soumise</ion-title></ion-toolbar></ion-header>
<ion-content class="page-content ion-text-center">
  <div class="success-wrapper">
    <ion-icon name="bag-check-outline" class="success-icon"></ion-icon>
    <h2>Commande soumise !</h2>
    <p>Votre commande est en attente de validation par l'agence. Le crédit démarrera à la livraison.</p>
    <div class="status-badge">INITIÉ</div>
    <ion-button expand="block" routerLink="/dashboard">Retour à l'accueil</ion-button>
  </div>
</ion-content>`,
styles: [`.page-content{--background:#FAF6EE}ion-toolbar{--background:#fff;--color:#0D1B2A}.success-wrapper{padding:48px 24px;display:flex;flex-direction:column;align-items:center;gap:16px}.success-icon{font-size:80px;color:#C9922A}h2{font-family:'Playfair Display',serif;font-size:22px;color:#0D1B2A;margin:0}p{font-size:13px;color:#64748B;text-align:center;line-height:1.6}.status-badge{background:#FFF7ED;color:#F97316;border:1.5px solid #F97316;border-radius:20px;padding:6px 18px;font-size:12px;font-weight:700;letter-spacing:.08em}ion-button{--border-radius:12px;--background:#C9922A;font-weight:600;width:100%}`] })
export class OrderConfirmationPage {}
