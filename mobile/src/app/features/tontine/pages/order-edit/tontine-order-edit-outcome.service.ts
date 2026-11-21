import { Injectable } from '@angular/core';

/**
 * Passage d'information entre la page « Modifier la commande » et la fiche membre :
 * après l'enregistrement, la fiche ouvre le reçu si le commercial l'a demandé.
 */
@Injectable({ providedIn: 'root' })
export class TontineOrderEditOutcomeService {
  private receiptMemberId: string | null = null;

  requestReceipt(memberId: string): void {
    this.receiptMemberId = memberId;
  }

  /** Vrai une seule fois pour ce membre : la demande est consommée. */
  consumeReceiptRequest(memberId: string | null): boolean {
    if (!memberId || this.receiptMemberId !== String(memberId)) {
      return false;
    }
    this.receiptMemberId = null;
    return true;
  }
}
