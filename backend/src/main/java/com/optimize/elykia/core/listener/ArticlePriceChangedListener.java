package com.optimize.elykia.core.listener;

import com.optimize.elykia.core.event.ArticlePriceChangedEvent;
import com.optimize.elykia.core.service.stock.StockPriceRealignmentJobRunner;
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
@RequiredArgsConstructor
@Slf4j
public class ArticlePriceChangedListener {

    private final StockPriceRealignmentJobRunner stockPriceRealignmentJobRunner;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onArticlePriceChanged(ArticlePriceChangedEvent event) {
        if (event == null || event.getArticleId() == null) {
            return;
        }
        if (!event.isCommercialSync() && !event.isTontineSync()) {
            return;
        }
        stockPriceRealignmentJobRunner.runAsync(event);
    }
}
