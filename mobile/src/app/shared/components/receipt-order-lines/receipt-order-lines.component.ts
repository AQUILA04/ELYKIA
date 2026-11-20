import { Component, Input } from '@angular/core';
import { PrintableOrderItem } from '../../../core/services/printing.service';

@Component({
  selector: 'app-receipt-order-lines',
  templateUrl: './receipt-order-lines.component.html',
  styleUrls: ['./receipt-order-lines.component.scss'],
  standalone: false
})
export class ReceiptOrderLinesComponent {
  @Input() items: PrintableOrderItem[] | null | undefined = [];
  @Input() totalAmount = 0;
  /** Libellé de la ligne de total (commande tontine : montant de la commande, le reste à payer suit). */
  @Input() totalLabel = 'Total à payer';
  /** `CASH` : règle des ventes comptant (aussi utilisée pour les commandes tontine). Vide : règle générale. */
  @Input() saleType: string | null = null;

  get hasItems(): boolean {
    return (this.items?.length ?? 0) > 0;
  }
}
