import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

/**
 * Header Type C (v2) — hero navy avec eyebrow, titre Playfair et sous-titre.
 * Pilote sur les écrans tontine ; première carte du body doit chevaucher le header.
 */
@Component({
  selector: 'app-elyk-page-header',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './elyk-page-header.component.html',
  styleUrls: ['./elyk-page-header.component.scss'],
})
export class ElykPageHeaderComponent {
  /** Eyebrow uppercase (ex. « ESPACE TONTINE »). */
  @Input() eyebrow = '';

  /** Titre principal Playfair. */
  @Input() title = '';

  /** Sous-titre court sous le titre. */
  @Input() subtitle = '';

  /** Affiche le bouton retour. */
  @Input() showBack = false;

  @Output() back = new EventEmitter<void>();

  onBack(): void {
    this.back.emit();
  }
}
