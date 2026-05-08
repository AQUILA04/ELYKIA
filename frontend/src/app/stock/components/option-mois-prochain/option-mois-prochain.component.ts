import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-option-mois-prochain',
  template: `
    <div *ngIf="isVisible" class="card mb-3 border-primary">
      <div class="card-header bg-primary text-white">
        Créer pour le mois prochain ?
      </div>
      <div class="card-body">
        <p class="card-text">
          Vous êtes dans les 5 derniers jours du mois. Souhaitez-vous créer cette demande pour le mois prochain ?
          <br>
          <small class="text-danger fw-bold">Attention : Créer pour le mois prochain clôturera automatiquement votre stock du mois courant.</small>
        </p>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary" [class.active]="!forNextMonth" (click)="onSelectCurrentMonth()">
            Mois courant
          </button>
          <button type="button" class="btn btn-outline-primary" [class.active]="forNextMonth" (click)="onSelectNextMonth()">
            Mois prochain
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gap-2 { gap: 0.5rem; }
    .btn.active { font-weight: bold; border-width: 2px; }
  `]
})
export class OptionMoisProchainComponent {
  @Input() daysRemaining: number = -1;
  @Input() isVisible: boolean = false;
  @Output() selectNextMonth = new EventEmitter<boolean>();

  forNextMonth: boolean = false;

  onSelectNextMonth() {
    this.forNextMonth = true;
    this.selectNextMonth.emit(true);
  }

  onSelectCurrentMonth() {
    this.forNextMonth = false;
    this.selectNextMonth.emit(false);
  }
}
