import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TontineDeliveryItem } from '../../../models/tontine.model';
import {
  TontineOrderBalance,
  computeTontineOrderBalance,
  tontineOrderBalanceLabels
} from '../../../core/utils/tontine-order-balance.util';
import {
  displayedTontineDeliveryQuantity,
  stepTontineDeliveryItem
} from '../../../core/utils/tontine-delivery-item-quantity.util';

/** Ligne du récapitulatif : article de la commande et stock tontine disponible chez le commercial. */
export interface TontineDeliverRecapItem extends TontineDeliveryItem {
  articleName?: string;
  /** Quantité disponible dans le stock tontine du commercial ; `null` si elle n'est pas connue. */
  stockAvailable?: number | null;
}

export type TontineDeliverRecapResult =
  | { action: 'confirm'; items: TontineDeliverRecapItem[]; reduced: boolean; total: number }
  | { action: 'topup'; amount: number }
  | { action: 'cancel' };

/**
 * Dernier réglage avant la remise : la commande, le solde du membre, le reste à payer.
 * Le commercial peut compléter le solde ou réduire la commande. **Confirmer la livraison**
 * n'est possible que si le solde couvre la commande et que le stock suffit.
 */
@Component({
  selector: 'app-tontine-deliver-recap-modal',
  templateUrl: './tontine-deliver-recap-modal.component.html',
  styleUrls: ['./tontine-deliver-recap-modal.component.scss'],
  standalone: false
})
export class TontineDeliverRecapModalComponent implements OnInit {
  @Input() clientName = '';
  @Input() reference?: string;
  @Input() items: TontineDeliverRecapItem[] = [];
  @Input() netContribution = 0;

  lines: TontineDeliverRecapItem[] = [];
  private readonly originalQuantity = new Map<TontineDeliverRecapItem, number>();
  reduced = false;

  readonly labels = tontineOrderBalanceLabels(false);

  constructor(private readonly modalCtrl: ModalController) {}

  ngOnInit(): void {
    this.lines = (this.items || []).map(item => ({ ...item }));
    this.lines.forEach(line => this.originalQuantity.set(line, displayedTontineDeliveryQuantity(line)));
  }

  get total(): number {
    return this.lines.reduce((sum, line) => sum + (line.totalPrice || 0), 0);
  }

  get balance(): TontineOrderBalance {
    return computeTontineOrderBalance(this.netContribution, this.total);
  }

  /** Lignes dont le stock tontine du commercial ne couvre pas la quantité. */
  get missingStock(): TontineDeliverRecapItem[] {
    return this.lines.filter(line =>
      line.stockAvailable !== null && line.stockAvailable !== undefined && line.stockAvailable < line.quantity);
  }

  get canConfirm(): boolean {
    return this.lines.length > 0 && this.balance.amountDue <= 0 && this.missingStock.length === 0;
  }

  displayedQuantity(line: TontineDeliverRecapItem): number {
    return displayedTontineDeliveryQuantity(line);
  }

  isMissingStock(line: TontineDeliverRecapItem): boolean {
    return this.missingStock.includes(line);
  }

  /** On ne fait que réduire : la quantité ne remonte pas au-delà de la commande. */
  canIncrease(line: TontineDeliverRecapItem): boolean {
    const original = this.originalQuantity.get(line) ?? 0;
    return displayedTontineDeliveryQuantity(line) < original;
  }

  canDecrease(line: TontineDeliverRecapItem): boolean {
    return displayedTontineDeliveryQuantity(line) > 1 || this.lines.length > 1;
  }

  change(line: TontineDeliverRecapItem, delta: number): void {
    if (delta > 0 && !this.canIncrease(line)) {
      return;
    }
    const index = this.lines.indexOf(line);
    if (index < 0) {
      return;
    }
    const next = stepTontineDeliveryItem(line, delta);
    if (next === null) {
      if (this.lines.length <= 1) {
        return;
      }
      this.lines = this.lines.filter(current => current !== line);
    } else {
      this.originalQuantity.set(next, this.originalQuantity.get(line) ?? 0);
      this.originalQuantity.delete(line);
      this.lines = this.lines.map(current => current === line ? next : current);
    }
    this.reduced = this.computeReduced();
  }

  topUp(): void {
    void this.modalCtrl.dismiss({ action: 'topup', amount: this.balance.amountDue } as TontineDeliverRecapResult);
  }

  confirm(): void {
    if (!this.canConfirm) {
      return;
    }
    void this.modalCtrl.dismiss({
      action: 'confirm',
      items: this.lines,
      reduced: this.reduced,
      total: this.total
    } as TontineDeliverRecapResult);
  }

  cancel(): void {
    void this.modalCtrl.dismiss({ action: 'cancel' } as TontineDeliverRecapResult);
  }

  private computeReduced(): boolean {
    if (this.lines.length !== (this.items || []).length) {
      return true;
    }
    return this.lines.some(line => displayedTontineDeliveryQuantity(line) !== (this.originalQuantity.get(line) ?? 0));
  }
}
