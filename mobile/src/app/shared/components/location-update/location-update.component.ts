import { Component, Input, OnInit } from '@angular/core';
import { ModalController, AlertController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-location-update',
  templateUrl: './location-update.component.html',
  standalone: false
})
export class LocationUpdateComponent implements OnInit {
  @Input() clientId!: string;

  manualGeolocation = false;
  latitude: number | null = null;
  longitude: number | null = null;

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {}

  async getGeolocation() {
    try {
      let permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        permissions = await Geolocation.requestPermissions();
      }

      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        await this.presentAlert('Permission refusée', "L'accès à la géolocalisation est nécessaire.");
        return;
      }

      const coordinates = await Geolocation.getCurrentPosition();
      this.latitude = coordinates.coords.latitude;
      this.longitude = coordinates.coords.longitude;
    } catch (error) {
      console.error('Error getting location', error);
      await this.presentAlert('Erreur de géolocalisation', "Impossible d'obtenir les coordonnées.");
    }
  }

  saveLocation() {
    if (this.latitude && this.longitude) {
      this.modalCtrl.dismiss({
        latitude: this.latitude,
        longitude: this.longitude,
      });
    }
  }

  dismissModal() {
    this.modalCtrl.dismiss();
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }
}
