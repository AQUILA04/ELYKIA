import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

export type ElykDecorVariant = 'ribbons' | 'grid';

/**
 * Header premium navy avec motif SVG (rubans ou grille).
 * Utiliser sur les écrans Type A (auth, dashboard, splash…).
 */
@Component({
  selector: 'app-elyk-decor-header',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './elyk-decor-header.component.html',
  styleUrls: ['./elyk-decor-header.component.scss'],
})
export class ElykDecorHeaderComponent {
  /** Motif décoratif : rubans (auth) ou grille (dashboard). */
  @Input() decor: ElykDecorVariant = 'ribbons';

  /** Titre centré dans la barre (ex. « Connexion »). */
  @Input() title = '';

  /** Affiche le bouton retour circulaire. */
  @Input() showBack = false;

  /** Hauteur compacte (listes secondaires) vs standard. */
  @Input() compact = false;

  @Output() back = new EventEmitter<void>();

  get decorSrc(): string {
    return this.decor === 'grid'
      ? 'assets/decor/header-grid.svg'
      : 'assets/decor/header-ribbons.svg';
  }

  onBack(): void {
    this.back.emit();
  }
}
