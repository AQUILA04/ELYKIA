package com.optimize.elykia.core.service.commercial;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.service.stock.CommercialMonthlyStockRecoveryService;
import com.optimize.elykia.core.util.UserProfilConstant;
import com.optimize.elykia.core.util.MonthEndCalculator;
import com.optimize.elykia.core.enumaration.StockStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class CommercialMonthlyStockService extends GenericService<CommercialMonthlyStock, Long> {

    private final UserService userService;
    private final CommercialMonthlyStockRecoveryService recoveryService;
    private final ArticlesRepository articlesRepository;

    protected CommercialMonthlyStockService(
            CommercialMonthlyStockRepository repository,
            UserService userService,
            CommercialMonthlyStockRecoveryService recoveryService,
            ArticlesRepository articlesRepository) {
        super(repository);
        this.userService = userService;
        this.recoveryService = recoveryService;
        this.articlesRepository = articlesRepository;
    }

    public long getDaysUntilMonthEnd() {
        return MonthEndCalculator.getDaysUntilMonthEnd();
    }

    @Transactional
    public void closeCurrentMonthStock(String collector) {
        LocalDate now = LocalDate.now();
        int month = now.getMonthValue();
        int year = now.getYear();

        CommercialMonthlyStock currentStock = ((CommercialMonthlyStockRepository) repository)
                .findByCollectorAndMonthAndYear(collector, month, year)
                .orElseThrow(() -> new CustomValidationException(
                        "Stock courant introuvable pour le commercial " + collector));

        if (currentStock.getStatus() == StockStatus.CLOSED) {
            throw new CustomValidationException(
                    "Le stock de ce mois est déjà clôturé.");
        }

        currentStock.setStatus(StockStatus.CLOSED);
        repository.save(currentStock);
    }

    public Page<CommercialMonthlyStock> getAll(String collector, Pageable pageable, Boolean historic) {
        return enrichPage(queryStocks(collector, pageable, historic));
    }

    private Page<CommercialMonthlyStock> queryStocks(String collector, Pageable pageable, Boolean historic) {
        LocalDate now = LocalDate.now();
        User currentUser = userService.getCurrentUser();
        CommercialMonthlyStockRepository stockRepository = (CommercialMonthlyStockRepository) repository;

        if (Objects.nonNull(historic) && historic) {
            if (collector != null) {
                return stockRepository.findByCollectorAndMonthNotAndYearNotOrderByIdDesc(
                        collector, now.getMonthValue(), now.getYear(), pageable);
            }
            if (currentUser.is(UserProfilConstant.PROMOTER)) {
                return stockRepository.findByCollectorAndMonthNotAndYearNotOrderByIdDesc(
                        currentUser.getUsername(), now.getMonthValue(), now.getYear(), pageable);
            }
            return stockRepository.findByMonthNotAndYearNotOrderByIdDesc(
                    now.getMonthValue(), now.getYear(), pageable);
        }

        if (collector != null) {
            return stockRepository.findByCollectorAndMonthAndYearOrderByIdDesc(
                    collector, now.getMonthValue(), now.getYear(), pageable);
        }
        if (currentUser.is(UserProfilConstant.PROMOTER)) {
            return stockRepository.findByCollectorAndMonthAndYearOrderByIdDesc(
                    currentUser.getUsername(), now.getMonthValue(), now.getYear(), pageable);
        }
        return stockRepository.findByMonthAndYearOrderByIdDesc(now.getMonthValue(), now.getYear(), pageable);
    }

    public Optional<CommercialMonthlyStock> findEnrichedByCollectorAndMonthAndYear(
            String collector, int month, int year) {
        return ((CommercialMonthlyStockRepository) repository)
                .findByCollectorAndMonthAndYear(collector, month, year)
                .map(this::enrichWithRecovery);
    }

    public CommercialMonthlyStock enrichWithRecovery(CommercialMonthlyStock stock) {
        stock.setRecoverySummary(recoveryService.aggregate(stock));
        return stock;
    }

    private Page<CommercialMonthlyStock> enrichPage(Page<CommercialMonthlyStock> page) {
        page.getContent().forEach(this::enrichWithRecovery);
        return page;
    }

    /**
     * Prépare un stock résiduel du mois précédent pour les tests E2E (rattrapage crédit).
     * Idempotent : complète la quantité restante si l'article existe déjà sur ce mois.
     */
    @Transactional
    public CommercialMonthlyStock seedResidualStockForE2e(
            String collector, Long articleId, int quantity, Double unitPrice) {
        LocalDate previousMonth = LocalDate.now().minusMonths(1);
        int month = previousMonth.getMonthValue();
        int year = previousMonth.getYear();

        Articles article = articlesRepository.findById(articleId)
                .orElseThrow(() -> new ResourceNotFoundException("Article introuvable : " + articleId));

        double price = unitPrice != null && unitPrice > 0
                ? unitPrice
                : Math.ceil(article.getSellingPrice());

        CommercialMonthlyStockRepository stockRepository = (CommercialMonthlyStockRepository) repository;
        CommercialMonthlyStock stock = stockRepository
                .findByCollectorAndMonthAndYear(collector, month, year)
                .orElseGet(() -> {
                    CommercialMonthlyStock newStock = new CommercialMonthlyStock();
                    newStock.setCollector(collector);
                    newStock.setMonth(month);
                    newStock.setYear(year);
                    newStock.setStatus(StockStatus.CLOSED);
                    return stockRepository.save(newStock);
                });

        Optional<CommercialMonthlyStockItem> existingItem = stock.getItems().stream()
                .filter(item -> item.getArticle().getId().equals(articleId))
                .findFirst();

        if (existingItem.isPresent()) {
            CommercialMonthlyStockItem item = existingItem.get();
            if (item.getQuantityRemaining() < quantity) {
                int delta = quantity - item.getQuantityRemaining();
                item.setQuantityTaken(item.getQuantityTaken() + delta);
                item.updateRemaining();
            }
        } else {
            CommercialMonthlyStockItem item = new CommercialMonthlyStockItem();
            item.setArticle(article);
            item.setQuantityTaken(quantity);
            item.setQuantitySold(0);
            item.setQuantityReturned(0);
            item.setWeightedAverageUnitPrice(price);
            item.setWeightedAveragePurchasePrice(price);
            item.setLastUnitPrice(price);
            item.setLastPurchasePrice(price);
            item.updateRemaining();
            stock.addItem(item);
        }

        return stockRepository.save(stock);
    }
}
