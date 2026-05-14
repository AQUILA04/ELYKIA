import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stockStatus',
  standalone: false
})
export class StockStatusPipe implements PipeTransform {
  
  transform(status: string | null | undefined, type: 'label' | 'class', context: 'request' | 'return' = 'request'): string {
    if (!status) {
      if (type === 'label') return context === 'return' ? 'CRÉÉE' : 'EN ATTENTE';
      return context === 'return' ? 'status-created-return' : 'status-pending';
    }

    const upperStatus = status.toUpperCase();

    if (type === 'label') {
      if (context === 'return') {
        const returnMap: Record<string, string> = {
          CREATED: 'CRÉÉE',
          RECEIVED: 'RÉCEPTIONNÉE',
          CANCELLED: 'ANNULÉE'
        };
        return returnMap[upperStatus] ?? upperStatus;
      }

      const map: Record<string, string> = {
        CREATED:   'EN ATTENTE',
        PENDING:   'EN ATTENTE',
        VALIDATED: 'VALIDÉE',
        APPROVED:  'VALIDÉE',
        DELIVERED: 'LIVRÉE',
        REFUSED:   'REFUSÉE',
        CANCELLED: 'ANNULÉE',
      };
      return map[upperStatus] ?? upperStatus;
    }

    if (type === 'class') {
      if (context === 'return') {
        const returnMap: Record<string, string> = {
          CREATED: 'status-validated', // badge bleu info (utilise le même style que Validated)
          RECEIVED: 'status-delivered', // badge vert succès (utilise le même style que Delivered)
          CANCELLED: 'status-cancelled' // badge rouge danger
        };
        return returnMap[upperStatus] ?? 'status-pending';
      }

      const map: Record<string, string> = {
        CREATED:   'status-pending',
        PENDING:   'status-pending',
        VALIDATED: 'status-validated',
        APPROVED:  'status-validated',
        DELIVERED: 'status-delivered',
        REFUSED:   'status-refused',
        CANCELLED: 'status-cancelled',
      };
      return map[upperStatus] ?? 'status-pending';
    }

    return '';
  }
}
