package com.optimize.elykia.commercialstock.api;

import java.time.LocalDate;
import java.util.List;

/** Port d'entrée unique du module pour les autres bounded contexts. */
public interface CommercialStockFacade {

    CommercialStockConsumptionResult stockIn(StockInCommand command);

    /** @throws RuntimeException de validation si le stock est insuffisant ou si la date antidatée rend un solde négatif. */
    CommercialStockConsumptionResult consume(ConsumeStockCommand command);

    /**
     * Restaure exactement les couches consommées par un mouvement (annulation de vente, extourne de dette).
     * Idempotence : un mouvement ne peut être restauré qu'une seule fois.
     */
    CommercialStockConsumptionResult restore(Long originalMovementId, CommercialStockMovementType restoreType,
                                             LocalDate accountingDate, String performedBy);

    /**
     * Restaure, parmi les sorties non encore restaurées rattachées à une référence métier (ex. un crédit),
     * exactement {@code quantity} unités d'un article. Renvoie la quantité effectivement restaurée.
     */
    int restoreByReference(String collector, Long articleId, StockActivityType activityType,
                           CommercialStockReferenceType referenceType, Long referenceId,
                           CommercialStockMovementType restoreType, int quantity, LocalDate accountingDate,
                           String performedBy);

    /** Transfert interne entre activités, sans impact sur le stock magasin ; renvoie l'identifiant de transfert. */
    String transferBetweenActivities(String collector, Long articleId, StockActivityType from, StockActivityType to,
                                     int quantity, Double targetSalePrice, LocalDate accountingDate, String performedBy);

    /** Réaligne le prix de vente effectif des couches ouvertes ; le coût d'achat reste inchangé. Renvoie les unités réévaluées. */
    int realignSalePrices(Long articleId, StockActivityType activityType, String collector, double newSalePrice,
                          String performedBy);

    int availableQuantity(String collector, Long articleId, StockActivityType activityType);

    List<CommercialStockPositionView> getPositions(String collector, StockActivityType activityType, boolean onlyPositive);

    /** Timeline du ledger filtrée (par date comptable), du plus récent au plus ancien. */
    List<CommercialStockMovementView> getMovements(String collector, Long articleId, StockActivityType activityType,
                                                   CommercialStockMovementType movementType, LocalDate startDate,
                                                   LocalDate endDate, int limit);
}
