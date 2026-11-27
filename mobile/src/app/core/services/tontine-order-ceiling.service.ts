import { Injectable } from '@angular/core';
import { TontineCollection, TontineMember, TontineSession } from '../../models/tontine.model';
import { TontineCalculationService, societyShareIncreaseOf } from './tontine-calculation.service';
import {
  TontineOrderCeiling,
  computeTontineOrderCeiling
} from '../utils/tontine-order-ceiling.util';

/**
 * Plafond d'une commande tontine, même règle que le serveur (`TontineProjectedBalanceCalculator.project`) :
 * le plus grand du solde prévisionnel de l'année et du solde net cotisé.
 */
@Injectable({ providedIn: 'root' })
export class TontineOrderCeilingService {
  constructor(private readonly calculation: TontineCalculationService) {}

  async forMember(
    member: TontineMember,
    session: TontineSession | null | undefined,
    collections: TontineCollection[] = []
  ): Promise<TontineOrderCeiling> {
    let projected = 0;
    let available = member.availableContribution ?? 0;
    if (session) {
      let increase = 0;
      if (collections.length > 0) {
        try {
          const status = await this.calculation.calculateMemberStatus(member, session, collections);
          increase = societyShareIncreaseOf(status);
          // Part réajustée : le solde recalculé fait foi (il peut être plus bas que l'ancien solde).
          available = member.societyShareOverride != null
            ? (status.availableBudget ?? 0)
            : Math.max(available, status.availableBudget ?? 0);
        } catch (error) {
          console.error('Solde net indisponible', error);
        }
      }
      try {
        projected = await this.calculation.projectBalance(member, session, increase);
      } catch (error) {
        console.error('Solde prévisionnel indisponible', error);
      }
    }
    return computeTontineOrderCeiling(projected, available);
  }
}
