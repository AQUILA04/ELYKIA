import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: false
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) {
      return 'Il y a quelques secondes';
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return diffMin === 1 ? 'Il y a 1 min' : `Il y a ${diffMin} min`;
    }
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      return diffHours === 1 ? 'Il y a 1 h' : `Il y a ${diffHours} h`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return diffDays === 1 ? 'Il y a 1 jour' : `Il y a ${diffDays} jours`;
    }

    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
}
