import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Carte blanche chevauchant le header décoratif (overlap négatif).
 */
@Component({
  selector: 'app-elyk-overlap-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="elyk-overlap-card elyk-animate" [class.elyk-overlap-card--flush]="flush">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .elyk-overlap-card--flush {
      margin-top: 0;
    }
  `],
})
export class ElykOverlapCardComponent {
  /** Désactive l'overlap (contenu sous header sans chevauchement). */
  @Input() flush = false;
}
