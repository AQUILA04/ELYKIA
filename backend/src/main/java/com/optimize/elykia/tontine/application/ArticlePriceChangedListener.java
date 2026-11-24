package com.optimize.elykia.tontine.application;

import com.optimize.elykia.commercialstock.api.CommercialStockFacade;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import com.optimize.elykia.inventory.event.ArticlePriceChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Déclenche le job de réalignement après commit de la mise à jour article.
 * {@code @Async} est délégué au JobRunner (évite le stacking fragile avec
 * {@code @TransactionalEventListener}).
 */
@Component
@Slf4j
public class ArticlePriceChangedListener {

    private final StockPriceRealignmentJobRunner stockPriceRealignmentJobRunner;
    private CommercialStockFacade commercialStockFacade;

    public ArticlePriceChangedListener(StockPriceRealignmentJobRunner stockPriceRealignmentJobRunner) {
        this.stockPriceRealignmentJobRunner = stockPriceRealignmentJobRunner;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setCommercialStockFacade(CommercialStockFacade commercialStockFacade) {
        this.commercialStockFacade = commercialStockFacade;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onArticlePriceChanged(ArticlePriceChangedEvent event) {
        if (event == null || event.getArticleId() == null) {
            return;
        }
        if (!event.isCommercialSync() && !event.isTontineSync()) {
            return;
        }
        stockPriceRealignmentJobRunner.runAsync(event);
        realignContinuousStock(event);
    }

    private void realignContinuousStock(ArticlePriceChangedEvent event) {
        if (commercialStockFacade == null) {
            return;
        }
        String actor = event.getActingUsername() != null ? event.getActingUsername() : "auto-price-realign";
        try {
            if (event.isCommercialSync()) {
                commercialStockFacade.realignSalePrices(event.getArticleId(), StockActivityType.CREDIT, null,
                        event.getNewCreditSalePrice(), actor);
            }
            if (event.isTontineSync()) {
                commercialStockFacade.realignSalePrices(event.getArticleId(), StockActivityType.TONTINE, null,
                        event.getNewSellingPrice(), actor);
            }
        } catch (RuntimeException ex) {
            log.warn("Réévaluation du stock continu en échec pour l'article {} : {}", event.getArticleId(), ex.getMessage());
        }
    }
}
