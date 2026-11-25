package com.optimize.elykia.commercialstock.application;

import com.optimize.elykia.commercialstock.api.CommercialSalePriceSource;
import com.optimize.elykia.commercialstock.api.CommercialStockFacade;
import com.optimize.elykia.commercialstock.api.CommercialStockMovementType;
import com.optimize.elykia.commercialstock.api.ConsumeStockCommand;
import com.optimize.elykia.commercialstock.api.LegacyStockMovementEvent;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import com.optimize.elykia.commercialstock.api.StockInCommand;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Double écriture : rejoue dans le ledger continu les mouvements du stock legacy, APRÈS commit de l'opération métier
 * et dans une transaction indépendante — un écart du nouveau modèle ne peut jamais bloquer une vente ni une sortie.
 */
@Component
@Slf4j
public class LegacyStockShadowSync {

    private final CommercialStockFacade facade;
    private final boolean enabled;

    public LegacyStockShadowSync(CommercialStockFacade facade,
                                 @Value("${elykia.commercial-stock.shadow-sync.enabled:true}") boolean enabled) {
        this.facade = facade;
        this.enabled = enabled;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onLegacyMovement(LegacyStockMovementEvent event) {
        if (!enabled || event.quantity() <= 0 || event.collector() == null || event.articleId() == null) {
            return;
        }
        try {
            apply(event);
        } catch (RuntimeException drift) {
            log.warn("Écart double écriture stock commercial ({} {} {} art={} qty={}) : {}", event.kind(),
                    event.activityType(), event.collector(), event.articleId(), event.quantity(), drift.getMessage());
        }
    }

    private void apply(LegacyStockMovementEvent event) {
        String actor = event.performedBy() != null ? event.performedBy() : "legacy-sync";
        switch (event.kind()) {
            case STOCK_IN -> facade.stockIn(new StockInCommand(event.collector(), event.articleId(),
                    event.activityType(), event.quantity(), event.unitPurchaseCost() != null ? event.unitPurchaseCost() : 0d,
                    event.unitSalePrice(), event.referenceType(), event.referenceId(), event.referenceCode(),
                    event.tontineSessionId(), event.accountingDate(), actor, event.originWarehouseLotId(), null));
            case SALE -> facade.consume(consume(event, saleType(event.activityType()), actor));
            case RETURN -> facade.consume(consume(event, CommercialStockMovementType.RETURN, actor));
            case SALE_CANCELLATION -> {
                int restored = facade.restoreByReference(event.collector(), event.articleId(), event.activityType(),
                        event.referenceType(), event.referenceId(), CommercialStockMovementType.SALE_CANCELLATION,
                        event.quantity(), event.accountingDate(), actor);
                if (restored != event.quantity()) {
                    log.warn("Annulation partiellement rejouée ({}/{}) pour {} {} réf {}", restored, event.quantity(),
                            event.collector(), event.articleId(), event.referenceId());
                }
            }
        }
    }

    private static CommercialStockMovementType saleType(StockActivityType activity) {
        return activity == StockActivityType.TONTINE
                ? CommercialStockMovementType.TONTINE_DELIVERY : CommercialStockMovementType.CREDIT_SALE;
    }

    private static ConsumeStockCommand consume(LegacyStockMovementEvent event, CommercialStockMovementType type,
                                               String actor) {
        return new ConsumeStockCommand(event.collector(), event.articleId(), event.activityType(), type,
                event.quantity(), CommercialSalePriceSource.LAYER_FIFO, event.unitSalePrice(), event.referenceType(),
                event.referenceId(), event.referenceCode(), event.tontineSessionId(), event.accountingDate(), null, actor);
    }
}
