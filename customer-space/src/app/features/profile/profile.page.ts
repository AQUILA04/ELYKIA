import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
/** Page Profil Client. @author Francis AHONSU */
@Component({ selector: 'app-profile', standalone: true, imports: [CommonModule, IonicModule, RouterModule], template: `
<ion-header class="ion-no-border"><ion-toolbar><ion-buttons slot="start"><ion-back-button defaultHref="/dashboard"></ion-back-button></ion-buttons><ion-title>Mon Profil</ion-title></ion-toolbar></ion-header>
<ion-content class="page-content">
  <div class="page-inner">
    <div class="profile-card">
      <div class="avatar"><ion-icon name="person-outline"></ion-icon></div>
      <div class="profile-name">{{ session?.fullName }}</div>
      <div class="profile-phone">{{ session?.phone }}</div>
    </div>
    <ion-button expand="block" color="danger" fill="outline" (click)="logout()">Se déconnecter</ion-button>
  </div>
</ion-content>`,
styles: [`.page-content{--background:#FAF6EE}.page-inner{padding:24px}ion-toolbar{--background:#fff;--color:#0D1B2A}.profile-card{background:#fff;border-radius:20px;padding:28px;text-align:center;box-shadow:0 4px 20px rgba(13,27,42,.08);margin-bottom:24px}.avatar{width:72px;height:72px;border-radius:50%;background:#FAF6EE;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}.avatar ion-icon{font-size:36px;color:#C9922A}.profile-name{font-size:18px;font-weight:700;color:#0D1B2A;font-family:'Playfair Display',serif}.profile-phone{font-size:13px;color:#64748B;margin-top:4px}ion-button{--border-radius:12px;font-weight:600}`] })
export class ProfilePage {
  session = this.sessionService.currentSession;
  constructor(private sessionService: CustomerSessionService, private router: Router) {}
  logout(): void { this.sessionService.clearSession(); this.router.navigate(['/auth']); }
}
