import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { RmPackClient } from '../../../core/services/rm/rm.models';
import { RmContactWriteService } from '../../../core/services/rm/rm-contact-write.service';
import { OnlineWriteError } from '../../../core/services/online-first-write.types';

@Component({
  selector: 'app-rm-client-edit-sheet',
  templateUrl: './rm-client-edit-sheet.component.html',
  styleUrls: ['./rm-client-edit-sheet.component.scss'],
  standalone: false,
})
export class RmClientEditSheetComponent implements OnInit {
  @Input() client!: RmPackClient;

  phone = '';
  latitude: number | null = null;
  longitude: number | null = null;
  locating = false;
  submitting = false;
  phoneError: string | null = null;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly contactWrite: RmContactWriteService,
    private readonly toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.phone = this.client?.phone || '';
    this.latitude = this.client?.latitude ?? null;
    this.longitude = this.client?.longitude ?? null;
  }

  get hasGeo(): boolean {
    return this.latitude != null && this.longitude != null;
  }

  get mllPreview(): string | null {
    if (!this.hasGeo) {
      return this.client?.mll || null;
    }
    return `https://www.google.com/maps/search/?api=1&query=${this.latitude},${this.longitude}`;
  }

  get isValid(): boolean {
    const phoneOk = !!this.phone?.trim() && !this.phoneError;
    return phoneOk;
  }

  validatePhone(): void {
    const value = (this.phone || '').trim();
    if (!value) {
      this.phoneError = 'Téléphone obligatoire';
    } else if (value.length < 8) {
      this.phoneError = 'Numéro trop court';
    } else {
      this.phoneError = null;
    }
  }

  async captureLocation(): Promise<void> {
    this.locating = true;
    try {
      let permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        permissions = await Geolocation.requestPermissions();
      }
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        await this.toast('Permission géolocalisation refusée', 'danger');
        return;
      }
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      this.latitude = position.coords.latitude;
      this.longitude = position.coords.longitude;
      await this.toast('Position capturée', 'success');
    } catch {
      await this.toast('Impossible d\'obtenir la position', 'danger');
    } finally {
      this.locating = false;
    }
  }

  openMaps(): void {
    const url = this.mllPreview;
    if (url) {
      window.open(url, '_blank');
    }
  }

  dismiss(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  async save(): Promise<void> {
    this.validatePhone();
    if (!this.isValid || this.submitting) {
      return;
    }

    this.submitting = true;
    try {
      const result = await this.contactWrite.updateContact({
        clientId: this.client.id,
        phone: this.phone.trim(),
        latitude: this.latitude ?? undefined,
        longitude: this.longitude ?? undefined,
        mll: this.mllPreview || undefined
      });
      await this.toast(
        result.mode === 'online'
          ? 'Contact mis à jour sur le serveur'
          : 'Contact enregistré hors ligne — sync ultérieure',
        result.mode === 'online' ? 'success' : 'warning'
      );
      await this.modalCtrl.dismiss({ client: result.client, mode: result.mode }, 'confirm');
    } catch (error) {
      await this.toast(
        error instanceof OnlineWriteError || error instanceof Error
          ? error.message
          : 'Échec de la mise à jour',
        'danger'
      );
    } finally {
      this.submitting = false;
    }
  }

  private async toast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2600, color, position: 'top' });
    await t.present();
  }
}
