
import { Component, Input } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Clipboard } from '@capacitor/clipboard';

@Component({
  selector: 'app-log-modal',
  templateUrl: './log-modal.component.html',
  styleUrls: ['./log-modal.component.scss'],
  standalone: false
})
export class LogModalComponent {
  @Input() logs!: string | Blob;

  constructor(
    private modalController: ModalController,
    private toastController: ToastController
  ) {}

  async clearLogs() {
    await this.modalController.dismiss({ clear: true });
  }

  dismiss() {
    this.modalController.dismiss();
  }

  async copyLogs() {
    let logText = '';
    if (typeof this.logs === 'string') {
      logText = this.logs;
    } else if (this.logs instanceof Blob) {
      logText = await this.logs.text();
    }

    await Clipboard.write({
      string: logText
    });

    const toast = await this.toastController.create({
      message: 'Logs copiés dans le presse-papiers',
      duration: 2000,
      position: 'top',
      color: 'success'
    });
    await toast.present();
  }
}
