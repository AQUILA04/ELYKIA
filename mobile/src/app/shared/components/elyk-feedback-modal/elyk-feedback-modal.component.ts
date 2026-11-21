import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, checkmarkCircle, informationCircle, warning } from 'ionicons/icons';

export type ElykFeedbackKind = 'error' | 'success' | 'warning' | 'info';

export interface ElykFeedbackAction {
  /** Valeur renvoyée par `onDidDismiss().data`. */
  role: string;
  text: string;
  /** Bouton principal (navy) ou secondaire (contour). */
  primary?: boolean;
}

const ICONS: Record<ElykFeedbackKind, string> = {
  error: 'alert-circle',
  success: 'checkmark-circle',
  warning: 'warning',
  info: 'information-circle'
};

/**
 * Fenêtre commune d'erreur, de succès ou d'avertissement (design system mobile).
 * S'ouvre par `FeedbackService` ; ne pas l'instancier directement dans un écran.
 */
@Component({
  selector: 'app-elyk-feedback-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './elyk-feedback-modal.component.html',
  styleUrls: ['./elyk-feedback-modal.component.scss']
})
export class ElykFeedbackModalComponent {
  @Input() kind: ElykFeedbackKind = 'info';
  @Input() title = '';
  @Input() message = '';
  /** Lignes de détail facultatives (ex. montants, chemin du PDF). */
  @Input() details: string[] = [];
  @Input() actions: ElykFeedbackAction[] = [{ role: 'ok', text: 'OK', primary: true }];

  constructor(private readonly modalCtrl: ModalController) {
    addIcons({ alertCircle, checkmarkCircle, informationCircle, warning });
  }

  get icon(): string {
    return ICONS[this.kind] ?? ICONS.info;
  }

  close(role: string): void {
    void this.modalCtrl.dismiss(role, role);
  }
}
