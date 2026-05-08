import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-alerte-fin-mois',
  template: `
    <div *ngIf="showAlert && alerteMessage" class="alert mb-3" [ngClass]="alerteType === 'danger' ? 'alert-danger' : 'alert-warning'">
      {{ alerteMessage }}
    </div>
  `
})
export class AlerteFinMoisComponent implements OnInit, OnChanges {
  @Input() daysRemaining: number = -1;
  @Input() showAlert: boolean = false;

  alerteMessage: string = '';
  alerteType: 'warning' | 'danger' = 'warning';

  ngOnInit() {
    this.updateMessage();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['daysRemaining'] || changes['showAlert']) {
      this.updateMessage();
    }
  }

  private updateMessage() {
    if (!this.showAlert) {
      this.alerteMessage = '';
      return;
    }

    if (this.daysRemaining <= 5 && this.daysRemaining > 0) {
      this.alerteType = 'warning';
      this.alerteMessage = `⚠️ Il reste ${this.daysRemaining} jour(s) avant la fin du mois. Tous les articles non vendus doivent être retournés en stock ou distribués avant la fin du mois.`;
    } else if (this.daysRemaining === 0) {
      this.alerteType = 'danger';
      this.alerteMessage = `🔴 C'est le dernier jour du mois. Tous les articles doivent être retournés ou distribués AUJOURD'HUI.`;
    } else {
      this.alerteMessage = '';
    }
  }
}
