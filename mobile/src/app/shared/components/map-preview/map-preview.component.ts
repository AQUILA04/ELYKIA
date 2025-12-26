import { Component, Input, AfterViewInit, ElementRef, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, Platform } from '@ionic/angular';
import * as L from 'leaflet';
import { Browser } from '@capacitor/browser';
import { Network, ConnectionStatus } from '@capacitor/network';
import { PluginListenerHandle } from '@capacitor/core';

// Fix Leaflet's default icon path issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
});

@Component({
  selector: 'app-map-preview',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Localisation du Client</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Fermer</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar class="info-toolbar" *ngIf="fullName">
        <div class="ion-padding-start ion-padding-end ion-padding-bottom">
          <h2 class="client-name">{{ fullName }}</h2>
          <p class="client-address">{{ address }} - {{ quarter }}</p>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ng-container *ngIf="isOnline; else offlineState">
        <div *ngIf="lat && lng; else noLocation" class="map-container"></div>
        <ng-template #noLocation>
          <div class="empty-state">
            <ion-icon name="location-sharp" class="empty-icon"></ion-icon>
            <h2>Localisation non disponible</h2>
            <p>Les coordonnées GPS pour ce client n'ont pas été enregistrées.</p>
          </div>
        </ng-template>
      </ng-container>
      <ng-template #offlineState>
        <div class="empty-state">
          <ion-icon name="cloud-offline-sharp" class="empty-icon"></ion-icon>
          <h2>Vous êtes hors ligne</h2>
          <p>La prévisualisation de la carte nécessite une connexion internet.</p>
          <ion-button (click)="openGoogleMapsApp()" fill="outline" *ngIf="lat && lng">
            <ion-icon name="logo-google" slot="start"></ion-icon>
            Ouvrir dans Google Maps
          </ion-button>
        </div>
      </ng-template>
    </ion-content>
  `,
  styles: [`
    :host, .map-container, .empty-state {
      height: 100%;
      width: 100%;
    }
    ion-content { --background: var(--ion-color-light); }
    .info-toolbar { --background: var(--ion-color-light); }
    .client-name { font-size: 1.1rem; font-weight: 600; margin: 0 0 4px 0; }
    .client-address { font-size: 0.8rem; color: var(--ion-color-medium-shade); margin: 0; }
    .map-container { cursor: pointer; }
    .empty-state {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 20px;
      color: var(--ion-color-medium);
    }
    .empty-icon { font-size: 5rem; margin-bottom: 1rem; }
  `],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class MapPreviewComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() lat: number | undefined;
  @Input() lng: number | undefined;
  @Input() mll: string | undefined;
  @Input() fullName: string | undefined;
  @Input() address: string | undefined;
  @Input() quarter: string | undefined;
  @Input() zoom: number = 17;
  
  isOnline = true;
  private map!: L.Map;
  private networkListener: PluginListenerHandle | null = null;

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
    private modalController: ModalController,
    private platform: Platform
  ) {}

  async ngOnInit() {
    const status = await Network.getStatus();
    this.isOnline = status.connected;

    this.networkListener = await Network.addListener('networkStatusChange', (status) => {
      this.isOnline = status.connected;
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit() {
    if (this.isOnline && this.lat && this.lng) {
      this.initMap();
    }
  }

  ngOnDestroy() {
    if (this.networkListener) {
      this.networkListener.remove();
    }
  }

  dismiss() {
    this.modalController.dismiss();
  }

  private initMap() {
    setTimeout(() => {
      if (this.lat === undefined || this.lng === undefined) return;
      const container = this.elementRef.nativeElement.querySelector('.map-container');
      if (!container) return;
      if (this.map) { this.map.setView([this.lat, this.lng], this.zoom); return; }

      this.map = L.map(container).setView([this.lat, this.lng], this.zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
      L.marker([this.lat, this.lng]).addTo(this.map)
        .bindPopup(this.fullName || 'Localisation du client');
      this.map.on('click', () => this.openInGoogleMaps());
      this.cdr.detectChanges();
    }, 50);
  }

  private async openInGoogleMaps() {
    if (!this.mll) { console.error('Map link (mll) is not available.'); return; }
    await Browser.open({ url: this.mll, presentationStyle: 'popover', toolbarColor: '#3880ff' });
  }

  async openGoogleMapsApp() {
    if (!this.lat || !this.lng) return;

    let deepLink = `https://www.google.com/maps?q=${this.lat},${this.lng}`;
    if (this.platform.is('ios')) {
      deepLink = `comgooglemaps://?q=${this.lat},${this.lng}`;
    } else if (this.platform.is('android')) {
      deepLink = `geo:${this.lat},${this.lng}?q=${this.lat},${this.lng}`;
    }

    try {
      await Browser.open({ url: deepLink });
    } catch (e) {
      console.error('Could not open deep link', e);
      // Fallback to web version if deep link fails
      await Browser.open({ url: `https://www.google.com/maps?q=${this.lat},${this.lng}` });
    }
  }
}