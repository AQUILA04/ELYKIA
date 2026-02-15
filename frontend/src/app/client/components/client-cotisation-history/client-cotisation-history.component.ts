import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-client-cotisation-history',
  templateUrl: './client-cotisation-history.component.html',
  styleUrls: ['./client-cotisation-history.component.scss']
})
export class ClientCotisationHistoryComponent {
  @Input() cotisations: any[] = [];
  @Input() totalCotisationElements: number = 0;
  @Input() cotisationPageSize: number = 10;

  @Output() pageChange = new EventEmitter<PageEvent>();

  onPageChange(event: PageEvent): void {
    this.pageChange.emit(event);
  }

  getStatusLabel(status: string): string {
    const translations: {[key: string]: string} = {
      'CREATED': 'Créé',
      'VALIDATED': 'Validé',
      'INPROGRESS': 'En cours',
      'DELIVERED': 'Livré',
      'ENDED': 'Terminé',
      'SETTLED': 'Clôturé',
      'ACTIF': 'Actif',
      'STARTED': 'Démarré'
    };
    return translations[status] || status;
  }

  getStatusClass(status: string): string {
    const badgeClasses: {[key: string]: string} = {
      'ACTIF': 'badge-success',
      'CREATED': 'badge-primary',
      'VALIDATED': 'badge-success',
      'INPROGRESS': 'badge-warning',
      'DELIVERED': 'badge-success',
      'ENDED': 'badge-dark',
      'SETTLED': 'badge-secondary',
      'STARTED': 'badge-success'
    };
    return badgeClasses[status] || 'badge-secondary';
  }
}
