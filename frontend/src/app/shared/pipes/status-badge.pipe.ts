import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'statusBadge'
})
export class StatusBadgePipe implements PipeTransform {
  transform(status: string): { label: string; badgeClass: string } {
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

    const label = translations[status] || status;
    const badgeClass = badgeClasses[status] || 'badge-secondary';

    return { label, badgeClass };
  }
}
