package com.optimize.elykia.core.service.stock;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.article.ArticleHistory;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.stock.CommercialStockMovement;
import com.optimize.elykia.core.entity.stock.StockMovement;
import com.optimize.elykia.core.entity.stock.StockReturn;
import com.optimize.elykia.core.entity.stock.StockReturnItem;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.enumaration.StockHistoryReferenceType;
import com.optimize.elykia.core.enumaration.StockOperationType;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import com.optimize.elykia.core.repository.ArticleHistoryRepository;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.CommercialStockMovementRepository;
import com.optimize.elykia.core.repository.StockMovementRepository;
import com.optimize.elykia.core.repository.StockReturnRepository;
import com.optimize.elykia.core.support.IntegrationTestSupport;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class StockReturnTraceabilityIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private StockReturnService stockReturnService;
    @Autowired
    private ArticlesRepository articlesRepository;
    @Autowired
    private StockReturnRepository stockReturnRepository;
    @Autowired
    private StockMovementRepository stockMovementRepository;
    @Autowired
    private ArticleHistoryRepository articleHistoryRepository;
    @Autowired
    private CommercialMonthlyStockRepository monthlyStockRepository;
    @Autowired
    private CommercialStockMovementRepository commercialStockMovementRepository;
    @Autowired
    private EntityManager entityManager;

    @MockBean
    private UserService userService;
    @MockBean
    private User currentUser;

    @Test
    void validateReturn_reintegratesWarehouseAndDecrementsTheCorrectCommercialMonthlyStockWithTraceability() {
        // Given
        Articles article = persistArticle("CHAINE-RETOUR", 7, 800.0, 1_500.0);
        CommercialMonthlyStock monthlyStock = persistMonthlyStock("commercial.return", article, 3);
        StockReturn stockReturn = persistCreatedReturn("RET-CHAIN-001", "commercial.return", article, 2);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("magasinier.return");

        // When
        stockReturnService.validateReturn(stockReturn.getId());
        entityManager.flush();
        entityManager.clear();

        // Then: le magasin est réintégré avec la même quantité que le retour validé
        Articles persistedArticle = articlesRepository.findById(article.getId()).orElseThrow();
        assertEquals(9, persistedArticle.getStockQuantity());
        StockReturn receivedReturn = stockReturnRepository.findByIdWithItems(stockReturn.getId()).orElseThrow();
        assertEquals(StockReturnStatus.RECEIVED, receivedReturn.getStatus());
        assertEquals(LocalDate.now(), receivedReturn.getReceivedDate());

        // Then: ledger magasin et ArticleHistory décrivent exactement la réintégration
        List<StockMovement> warehouseMovements = stockMovementRepository.findByArticleIdOrderByMovementDateDesc(article.getId());
        assertEquals(1, warehouseMovements.size());
        StockMovement warehouseMovement = warehouseMovements.get(0);
        assertEquals(MovementType.RETURN, warehouseMovement.getType());
        assertEquals(7, warehouseMovement.getStockBefore());
        assertEquals(2, warehouseMovement.getQuantity());
        assertEquals(9, warehouseMovement.getStockAfter());
        assertEquals(800.0, warehouseMovement.getUnitCost());
        assertEquals("magasinier.return", warehouseMovement.getPerformedBy());
        assertEquals("Validation retour stock " + stockReturn.getId(), warehouseMovement.getReason());

        List<ArticleHistory> histories = articleHistoryRepository.findByArticles_IdOrderByIdDesc(article.getId());
        assertEquals(1, histories.size());
        ArticleHistory history = histories.get(0);
        assertEquals(StockOperationType.RETURN, history.getOperationType());
        assertEquals(7, history.getInitialQuantity());
        assertEquals(2, history.getOperationQuantity());
        assertEquals(9, history.getFinalQuantity());
        assertEquals("magasinier.return", history.getOperationUser());
        assertEquals("commercial.return", history.getBeneficiary());
        assertEquals(StockHistoryReferenceType.STOCK_RETURN, history.getReferenceType());
        assertEquals(stockReturn.getId(), history.getReferenceId());
        assertEquals("RET-CHAIN-001", history.getReferenceLabel());

        // Then: seul le stock mensuel du commercial et de la période concernés est décrémenté
        CommercialMonthlyStock persistedMonthlyStock = monthlyStockRepository.findByIdWithItems(monthlyStock.getId()).orElseThrow();
        assertEquals("commercial.return", persistedMonthlyStock.getCollector());
        assertEquals(LocalDate.now().getMonthValue(), persistedMonthlyStock.getMonth());
        assertEquals(LocalDate.now().getYear(), persistedMonthlyStock.getYear());
        CommercialMonthlyStockItem monthlyItem = persistedMonthlyStock.getItems().iterator().next();
        assertEquals(article.getId(), monthlyItem.getArticle().getId());
        assertEquals(3, monthlyItem.getQuantityTaken());
        assertEquals(0, monthlyItem.getQuantitySold());
        assertEquals(2, monthlyItem.getQuantityReturned());
        assertEquals(1, monthlyItem.getQuantityRemaining());
        assertEquals(1_500.0, monthlyItem.getWeightedAverageUnitPrice());
        assertEquals(800.0, monthlyItem.getWeightedAveragePurchasePrice());

        // Then: le mouvement commercial relie le retour à la même ligne mensuelle et aux montants attendus
        List<CommercialStockMovement> commercialMovements = commercialStockMovementRepository
                .findByCollectorAndMovementTypeOrderByOperationDateDesc("commercial.return", CommercialStockMovementType.RETURN);
        assertEquals(1, commercialMovements.size());
        CommercialStockMovement commercialMovement = commercialMovements.get(0);
        assertEquals(monthlyItem.getId(), commercialMovement.getStockItem().getId());
        assertEquals(article.getId(), commercialMovement.getArticle().getId());
        assertEquals(3, commercialMovement.getQuantityBefore());
        assertEquals(2, commercialMovement.getQuantityMoved());
        assertEquals(1, commercialMovement.getQuantityAfter());
        assertEquals(stockReturn.getId(), commercialMovement.getStockReturnId());
        assertEquals(800.0, commercialMovement.getUnitPurchasePrice());
        assertEquals(1_500.0, commercialMovement.getUnitSalePrice());
        assertEquals(1_400.0, commercialMovement.getMarginAmount());
        assertEquals("STOCK_RETURN", commercialMovement.getSourceType());
        assertEquals(stockReturn.getId(), commercialMovement.getSourceId());
        assertNotNull(commercialMovement.getOperationDate());
        assertTrue(commercialMovement.getOperationDate().toLocalDate().equals(LocalDate.now()));
    }

    private Articles persistArticle(String name, int quantity, double purchasePrice, double creditSalePrice) {
        Articles article = new Articles();
        article.setName(name);
        article.setType("PACK");
        article.setMarque("Elykia");
        article.setModel("M-CHAIN");
        article.setStockQuantity(quantity);
        article.setPurchasePrice(purchasePrice);
        article.setSellingPrice(1_200.0);
        article.setCreditSalePrice(creditSalePrice);
        return articlesRepository.saveAndFlush(article);
    }

    private CommercialMonthlyStock persistMonthlyStock(String collector, Articles article, int quantityTaken) {
        CommercialMonthlyStock monthlyStock = new CommercialMonthlyStock();
        monthlyStock.setCollector(collector);
        monthlyStock.setMonth(LocalDate.now().getMonthValue());
        monthlyStock.setYear(LocalDate.now().getYear());
        CommercialMonthlyStockItem item = new CommercialMonthlyStockItem();
        item.setArticle(article);
        item.setQuantityTaken(quantityTaken);
        item.setQuantitySold(0);
        item.setQuantityReturned(0);
        item.setWeightedAverageUnitPrice(1_500.0);
        item.setWeightedAveragePurchasePrice(800.0);
        item.setLastUnitPrice(1_500.0);
        item.setLastPurchasePrice(800.0);
        item.updateRemaining();
        monthlyStock.addItem(item);
        return monthlyStockRepository.saveAndFlush(monthlyStock);
    }

    private StockReturn persistCreatedReturn(String reference, String collector, Articles article, int quantity) {
        StockReturn stockReturn = new StockReturn();
        stockReturn.setReference(reference);
        stockReturn.setCollector(collector);
        stockReturn.setReturnDate(LocalDate.now());
        stockReturn.setStatus(StockReturnStatus.CREATED);
        StockReturnItem item = new StockReturnItem();
        item.setArticle(article);
        item.setQuantity(quantity);
        stockReturn.addItem(item);
        return stockReturnRepository.saveAndFlush(stockReturn);
    }
}
