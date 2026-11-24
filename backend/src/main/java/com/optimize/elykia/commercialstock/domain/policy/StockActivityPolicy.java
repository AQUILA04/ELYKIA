package com.optimize.elykia.commercialstock.domain.policy;

import com.optimize.elykia.commercialstock.api.CommercialSalePriceSource;
import com.optimize.elykia.commercialstock.api.CommercialStockMovementType;
import com.optimize.elykia.commercialstock.api.StockActivityType;

/** Spécificités métier par activité (vente crédit vs livraison tontine). */
public sealed interface StockActivityPolicy permits CreditStockPolicy, TontineStockPolicy {

    StockActivityType activityType();

    /** Type de mouvement ledger produit par une sortie de vente/livraison. */
    CommercialStockMovementType saleMovementType();

    /** Source de prix par défaut quand aucun paramètre applicatif n'est défini. */
    CommercialSalePriceSource defaultPriceSource();

    boolean requiresTontineSessionContext();

    static StockActivityPolicy of(StockActivityType type) {
        return switch (type) {
            case CREDIT -> CreditStockPolicy.INSTANCE;
            case TONTINE -> TontineStockPolicy.INSTANCE;
        };
    }
}
