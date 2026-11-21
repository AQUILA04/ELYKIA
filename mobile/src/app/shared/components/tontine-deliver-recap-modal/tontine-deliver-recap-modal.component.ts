import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TontineDeliveryItem } from '../../../models/tontine.model';
import {
  TontineOrderBalance,
  computeTontineOrderBalance,
  tontineOrderBalanceLabels
} from '../../../core/utils/tontine-order-balance.util';
import {
  addTontineLinePick,
  displayedTontineDeliveryQuantity,
  stepTontineDeliveryItem,
  tontineQuantitiesByArticle
} from '../../../core/utils/tontine-delivery-item-quantity.util';
import { tontineCeilingExcess } from '../../../core/utils/tontine-order-ceiling.util';
import {
  TontineArticlePick,
  TontineArticlePickerModalComponent
} from '../tontine-article-picker-modal/tontine-article-picker-modal.component';

/** Ligne du récapitulatif : article de la commande et stock tontine disponible chez le commercial. */
export interface TontineDeliverRecapItem extends TontineDeliveryItem {
  articleName?: string;
  /** Quantité disponible dans le stock tontine du commercial ; `null` si elle n'est pas connue. */
  stockAvailable?: number | null;
}

/**
 * `reduced` vaut `true` dès que la commande a changé (réduction, ajout, retrait) : elle est alors
 * enregistrée sur le serveur avant la remise ou avant d'aller compléter le solde.
 */
export type TontineDeliverRecapResult =
  | { action: 'confirm'; items: TontineDeliverRecapItem[]; reduced: boolean; total: number }
  | { action: 'topup'; amount: number; items: TontineDeliverRecapItem[]; reduced: boolean }
  | { action: 'cancel' };

/**
 * Dernier réglage avant la remise : la commande, le solde du membre, le reste à payer, le plafond.
 * Le commercial peut compléter le solde, réduire la commande ou ajouter un article de son stock tontine.
 * **Confirmer la livraison** n'est possible que si le solde couvre la commande, que le stock suffit
 * et que la commande reste sous le plafond.
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
  /** Plafond de la commande (plus grand du solde prévisionnel et du solde net) ; null s'il n'est pas connu. */
  @Input() ceiling: number | null = null;
  /** Nécessaires pour « Ajouter un article » (stock tontine du commercial). */
  @Input() commercialUsername = '';
  @Input() sessionId: string | null = null;
  @Input() tontineDeliveryId = '';

  lines: TontineDeliverRecapItem[] = [];
  private readonly originalQuantity = new Map<string, number>();
  reduced = false;

  readonly labels = tontineOrderBalanceLabels(false);

  constructor(private readonly modalCtrl: ModalController) {}

  ngOnInit(): void {
    this.lines = (this.items || []).map(item => ({ ...item }));
    this.lines.forEach(line => this.originalQuantity.set(this.keyOf(line), displayedTontineDeliveryQuantity(line)));
  }

  get total(): number {
    return this.lines.reduce((sum, line) => sum + (line.totalPrice || 0), 0);
  }

  get balance(): TontineOrderBalance {
    return computeTontineOrderBalance(this.netContribution, this.total);
  }

  get ceilingExcess(): number {
    return this.ceiling === null ? 0 : tontineCeilingExcess(this.total, this.ceiling);
  }

  /** Lignes dont le stock tontine du commercial ne couvre pas la quantité. */
  get missingStock(): TontineDeliverRecapItem[] {
    return this.lines.filter(line =>
      line.stockAvailable !== null && line.stockAvailable !== undefined && line.stockAvailable < line.quantity);
  }

  get canConfirm(): boolean {
    return this.lines.length > 0
      && this.balance.amountDue <= 0
      && this.missingStock.length === 0
      && this.ceilingExcess <= 0;
  }

  get canAddArticle(): boolean {
    return !!this.sessionId && !!this.commercialUsername;
  }

  displayedQuantity(line: TontineDeliverRecapItem): number {
    return displayedTontineDeliveryQuantity(line);
  }

  isMissingStock(line: TontineDeliverRecapItem): boolean {
    return this.missingStock.includes(line);
  }

  /**
   * On peut remonter jusqu'à la quantité commandée, et au-delà seulement si le stock tontine du
   * commercial couvre une unité (ou un pack) de plus.
   */
  canIncrease(line: TontineDeliverRecapItem): boolean {
    const shown = displayedTontineDeliveryQuantity(line);
    if (shown < (this.originalQuantity.get(this.keyOf(line)) ?? 0)) {
      return true;
    }
    if (line.stockAvailable === null || line.stockAvailable === undefined) {
      return false;
    }
    const next = stepTontineDeliveryItem(line, 1);
    return !!next && next.quantity <= line.stockAvailable;
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
      this.lines = this.lines.map(current => current === line ? next : current);
    }
    this.reduced = this.computeChanged();
  }

  /** Ajout depuis le stock tontine du commercial uniquement, quantité bornée par ce stock. */
  async addArticle(): Promise<void> {
    if (!this.canAddArticle) {
      return;
    }
    const picker = await this.modalCtrl.create({
      component: TontineArticlePickerModalComponent,
      componentProps: {
        mode: 'deliver',
        commercialUsername: this.commercialUsername,
        sessionId: this.sessionId,
        quantitiesInOrder: tontineQuantitiesByArticle(this.lines),
        remainingUnderCeiling: this.ceiling === null ? null : Math.max(0, this.ceiling - this.total)
      }
    });
    await picker.present();
    const { data, role } = await picker.onDidDismiss<TontineArticlePick>();
    if (role !== 'pick' || !data) {
      return;
    }
    this.applyPick(data);
  }

  /** Ajoute une unité de l'article choisi (ligne existante augmentée ou nouvelle ligne). */
  applyPick(pick: TontineArticlePick): void {
    this.lines = addTontineLinePick(this.lines, pick, this.tontineDeliveryId)
      .map(line => String(line.articleId) === String(pick.articleId)
        ? { ...line, stockAvailable: pick.stockAvailable }
        : line);
    this.reduced = this.computeChanged();
  }

  topUp(): void {
    void this.modalCtrl.dismiss({
      action: 'topup',
      amount: this.balance.amountDue,
      items: this.lines,
      reduced: this.reduced
    } as TontineDeliverRecapResult);
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

  private keyOf(line: TontineDeliverRecapItem): string {
    return `${line.articleId}|${line.salePackMode || 'UNIT'}`;
  }

  private computeChanged(): boolean {
    if (this.lines.length !== (this.items || []).length) {
      return true;
    }
    return this.lines.some(line =>
      !this.originalQuantity.has(this.keyOf(line))
      || displayedTontineDeliveryQuantity(line) !== this.originalQuantity.get(this.keyOf(line)));
  }
}
