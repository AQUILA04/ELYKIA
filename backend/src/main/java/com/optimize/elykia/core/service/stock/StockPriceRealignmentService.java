package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.tontine.TontineStock;
import com.optimize.elykia.core.event.ArticlePriceChangedEvent;
import com.optimize.elykia.core.repository.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.core.repository.TontineStockRepository;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.util.ActingUserSecuritySupport;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Orchestration du réalignement auto : retour puis re-sortie au nouveau prix.
 * Isolation des erreurs par commercial (REQUIRES_NEW via self-proxy).
 */
@Service
@Slf4j
public class StockPriceRealignmentService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ArticlesService articlesService;
    private final CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository;
    private final TontineStockRepository tontineStockRepository;
    private final StockReturnService stockReturnService;
    private final StockRequestService stockRequestService;
    private final StockTontineReturnService stockTontineReturnService;
    private final StockTontineRequestService stockTontineRequestService;

    private StockPriceRealignmentService self;

    public StockPriceRealignmentService(
            ArticlesService articlesService,
            CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository,
            TontineStockRepository tontineStockRepository,
            StockReturnService stockReturnService,
            StockRequestService stockRequestService,
            StockTontineReturnService stockTontineReturnService,
            StockTontineRequestService stockTontineRequestService) {
        this.articlesService = articlesService;
        this.commercialMonthlyStockItemRepository = commercialMonthlyStockItemRepository;
        this.tontineStockRepository = tontineStockRepository;
        this.stockReturnService = stockReturnService;
        this.stockRequestService = stockRequestService;
        this.stockTontineReturnService = stockTontineReturnService;
        this.stockTontineRequestService = stockTontineRequestService;
    }

    @Autowired
    public void setSelf(@Lazy StockPriceRealignmentService self) {
        this.self = self;
    }

    public void realign(ArticlePriceChangedEvent event) {
        if (event == null || event.getArticleId() == null) {
            return;
        }
        String actingUsername = event.getActingUsername() != null ? event.getActingUsername() : "system";
        ActingUserSecuritySupport.runAs(actingUsername, () -> {
            Articles article = articlesService.getById(event.getArticleId());
            if (event.isCommercialSync()) {
                realignCommercialHolders(article, event, actingUsername);
            }
            if (event.isTontineSync()) {
                realignTontineHolders(article, event, actingUsername);
            }
        });
    }

    private void realignCommercialHolders(Articles article, ArticlePriceChangedEvent event, String actingUsername) {
        LocalDate now = LocalDate.now();
        List<CommercialMonthlyStockItem> holders = commercialMonthlyStockItemRepository
                .findRemainingByArticleAndPeriod(article.getId(), now.getMonthValue(), now.getYear());
        for (CommercialMonthlyStockItem item : holders) {
            String collector = item.getMonthlyStock().getCollector();
            int qty = item.getQuantityRemaining() != null ? item.getQuantityRemaining() : 0;
            if (qty <= 0) {
                continue;
            }
            try {
                self.realignOneCommercial(collector, article.getId(), qty, event, actingUsername);
            } catch (Exception ex) {
                log.error("Réalignement commercial échoué pour article={} collector={}: {}",
                        article.getId(), collector, ex.getMessage(), ex);
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void realignOneCommercial(
            String collector, Long articleId, int quantity, ArticlePriceChangedEvent event, String actingUsername) {
        Articles article = articlesService.getById(articleId);
        String note = buildComment(
                "commercial",
                event.getOldCreditSalePrice(),
                event.getNewCreditSalePrice(),
                actingUsername);
        ActingUserSecuritySupport.runAs(actingUsername, () -> {
            stockReturnService.createAndValidateForPriceRealignment(collector, article, quantity, note);
            stockRequestService.createValidateAndDeliverForPriceRealignment(collector, article, quantity, note);
        });
    }

    private void realignTontineHolders(Articles article, ArticlePriceChangedEvent event, String actingUsername) {
        int year = LocalDate.now().getYear();
        List<TontineStock> holders = tontineStockRepository
                .findByArticleIdAndYearAndAvailableQuantityGreaterThan(article.getId(), year, 0);
        for (TontineStock stock : holders) {
            int qty = stock.getAvailableQuantity() != null ? stock.getAvailableQuantity() : 0;
            if (qty <= 0) {
                continue;
            }
            try {
                self.realignOneTontine(stock.getCommercial(), article.getId(), qty, event, actingUsername);
            } catch (Exception ex) {
                log.error("Réalignement tontine échoué pour article={} collector={}: {}",
                        article.getId(), stock.getCommercial(), ex.getMessage(), ex);
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void realignOneTontine(
            String collector, Long articleId, int quantity, ArticlePriceChangedEvent event, String actingUsername) {
        Articles article = articlesService.getById(articleId);
        String note = buildComment(
                "tontine",
                event.getOldSellingPrice(),
                event.getNewSellingPrice(),
                actingUsername);
        ActingUserSecuritySupport.runAs(actingUsername, () -> {
            stockTontineReturnService.createAndValidateForPriceRealignment(
                    collector, article, quantity, note, true);
            stockTontineRequestService.createValidateAndDeliverForPriceRealignment(
                    collector, article, quantity, note);
        });
    }

    static String buildComment(String channel, double oldPrice, double newPrice, String actingUsername) {
        return String.format(
                "Action automatique suite à changement de prix %s (ancien: %.0f, nouveau: %.0f) le %s par %s",
                channel,
                oldPrice,
                newPrice,
                LocalDate.now().format(DATE_FMT),
                actingUsername);
    }
}
