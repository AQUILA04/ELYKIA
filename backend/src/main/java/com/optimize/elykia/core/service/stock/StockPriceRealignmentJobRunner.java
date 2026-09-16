package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.event.ArticlePriceChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockPriceRealignmentJobRunner {

    private final StockPriceRealignmentService stockPriceRealignmentService;

    @Async("stockPriceRealignmentExecutor")
    public void runAsync(ArticlePriceChangedEvent event) {
        try {
            log.info("Démarrage réalignement stock article={} commercialSync={} tontineSync={} by={}",
                    event.getArticleId(), event.isCommercialSync(), event.isTontineSync(),
                    event.getActingUsername());
            stockPriceRealignmentService.realign(event);
            log.info("Réalignement stock terminé pour article={}", event.getArticleId());
        } catch (Exception ex) {
            log.error("Échec global du réalignement stock pour article={}: {}",
                    event.getArticleId(), ex.getMessage(), ex);
        }
    }
}
