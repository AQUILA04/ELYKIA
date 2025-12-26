import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  @Input() icon: string = 'inbox';
  @Input() title: string = 'Aucune donnée';
  @Input() message: string = 'Il n\'y a rien à afficher pour le moment.';
  @Input() actionLabel?: string;
  @Input() actionIcon?: string;
  @Input() showAction: boolean = false;

  onActionClick(): void {
    // Émis par le parent si nécessaire
  }
}