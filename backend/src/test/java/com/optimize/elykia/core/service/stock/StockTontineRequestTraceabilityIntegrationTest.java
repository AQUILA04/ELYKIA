package com.optimize.elykia.core.service.stock;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.article.ArticleHistory;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.StockMovement;
import com.optimize.elykia.core.entity.stock.StockTontineRequest;
import com.optimize.elykia.core.entity.stock.StockTontineRequestItem;
import com.optimize.elykia.core.entity.stock.TontineStockMovement;
import com.optimize.elykia.core.entity.tontine.TontineStock;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.enumaration.StockHistoryReferenceType;
import com.optimize.elykia.core.enumaration.StockOperationType;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import com.optimize.elykia.core.enumaration.TontineStockMovementType;
import com.optimize.elykia.core.repository.ArticleHistoryRepository;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.StockMovementRepository;
import com.optimize.elykia.core.repository.StockTontineRequestRepository;
import com.optimize.elykia.core.repository.TontineStockMovementRepository;
import com.optimize.elykia.core.repository.TontineStockRepository;
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
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class StockTontineRequestTraceabilityIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private StockTontineRequestService stockTontineRequestService;
    @Autowired
    private ArticlesRepository articlesRepository;
    @Autowired
    private StockTontineRequestRepository stockTontineRequestRepository;
    @Autowired
    private StockMovementRepository stockMovementRepository;
    @Autowired
    private ArticleHistoryRepository articleHistoryRepository;
    @Autowired
    private TontineStockRepository tontineStockRepository;
    @Autowired
    private TontineStockMovementRepository tontineStockMovementRepository;
    @Autowired
    private EntityManager entityManager;

    @MockBean
    private UserService userService;
    @MockBean
    private User currentUser;

    @Test
    void deliverTontineRequest_persistsWarehouseReleaseAndAnnualTontineStockWithLinkedTraces() {
        // Given
        Articles article = persistArticle("CHAINE-TONTINE", 10, 800.0, 1_500.0);
        StockTontineRequest request = persistValidatedRequest(article, 3, "TRQ-CHAIN-001", "commercial.tontine");
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("magasinier.tontine");

        // When
        stockTontineRequestService.deliver(request.getId());
        entityManager.flush();
        entityManager.clear();

        // Then: sortie magasin, statut et prix figés de la demande tontine
        Articles persistedArticle = articlesRepository.findById(article.getId()).orElseThrow();
        assertEquals(7, persistedArticle.getStockQuantity());
        StockTontineRequest delivered = stockTontineRequestRepository.findByIdWithItems(request.getId()).orElseThrow();
        assertEquals(StockRequestStatus.DELIVERED, delivered.getStatus());
        assertEquals(LocalDate.now(), delivered.getDeliveryDate());
        assertEquals(LocalDate.now(), delivered.getAccountingDate());
        StockTontineRequestItem deliveredItem = delivered.getItems().iterator().next();
        assertEquals(3, deliveredItem.getQuantity());
        assertEquals(1_500.0, deliveredItem.getUnitPrice());
        assertEquals(800.0, deliveredItem.getPurchasePrice());
        assertEquals(4_500.0, delivered.getTotalSalePrice());
        assertEquals(2_400.0, delivered.getTotalPurchasePrice());

        // Then: ledger et ArticleHistory magasin avec référence de demande tontine
        List<StockMovement> warehouseMovements = stockMovementRepository.findByArticleIdOrderByMovementDateDesc(article.getId());
        assertEquals(1, warehouseMovements.size());
        StockMovement warehouseMovement = warehouseMovements.get(0);
        assertEquals(MovementType.RELEASE, warehouseMovement.getType());
        assertEquals(10, warehouseMovement.getStockBefore());
        assertEquals(3, warehouseMovement.getQuantity());
        assertEquals(7, warehouseMovement.getStockAfter());
        assertEquals(800.0, warehouseMovement.getUnitCost());
        assertEquals("magasinier.tontine", warehouseMovement.getPerformedBy());

        List<ArticleHistory> histories = articleHistoryRepository.findByArticles_IdOrderByIdDesc(article.getId());
        assertEquals(1, histories.size());
        ArticleHistory history = histories.get(0);
        assertEquals(StockOperationType.SORTIE, history.getOperationType());
        assertEquals(10, history.getInitialQuantity());
        assertEquals(3, history.getOperationQuantity());
        assertEquals(7, history.getFinalQuantity());
        assertEquals("commercial.tontine", history.getBeneficiary());
        assertEquals(StockHistoryReferenceType.STOCK_TONTINE_REQUEST, history.getReferenceType());
        assertEquals(request.getId(), history.getReferenceId());
        assertEquals("TRQ-CHAIN-001", history.getReferenceLabel());

        // Then: stock tontine annualisé au bon commercial, avec quantité et valorisation cohérentes
        TontineStock tontineStock = tontineStockRepository
                .findByArticleIdAndCommercialAndYear(article.getId(), "commercial.tontine", LocalDate.now().getYear())
                .orElseThrow();
        assertEquals(article.getId(), tontineStock.getArticleId());
        assertEquals("commercial.tontine", tontineStock.getCommercial());
        assertEquals(LocalDate.now().getYear(), tontineStock.getYear());
        assertEquals(3, tontineStock.getTotalQuantity());
        assertEquals(3, tontineStock.getAvailableQuantity());
        assertEquals(0, tontineStock.getDistributedQuantity());
        assertEquals(0, tontineStock.getQuantityReturned());
        assertEquals(1_500.0, tontineStock.getUnitPrice());
        assertEquals(1_500.0, tontineStock.getWeightedAverageUnitPrice());

        // Then: mouvement tontine relié à la demande source et aux mêmes quantités
        List<TontineStockMovement> tontineMovements = tontineStockMovementRepository
                .findByCollectorAndMovementTypeOrderByOperationDateDesc("commercial.tontine", TontineStockMovementType.STOCK_IN);
        assertEquals(1, tontineMovements.size());
        TontineStockMovement tontineMovement = tontineMovements.get(0);
        assertEquals(tontineStock.getId(), tontineMovement.getTontineStockId());
        assertEquals(article.getId(), tontineMovement.getArticleId());
        assertEquals(0, tontineMovement.getQuantityBefore());
        assertEquals(3, tontineMovement.getQuantityMoved());
        assertEquals(3, tontineMovement.getQuantityAfter());
        assertEquals(request.getId(), tontineMovement.getStockTontineRequestId());
        assertEquals("TRQ-CHAIN-001", tontineMovement.getStockTontineRequestReference());
        assertNotNull(tontineMovement.getOperationDate());
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

    private StockTontineRequest persistValidatedRequest(Articles article, int quantity, String reference, String collector) {
        StockTontineRequest request = new StockTontineRequest();
        request.setReference(reference);
        request.setCollector(collector);
        request.setRequestDate(LocalDate.now());
        request.setValidationDate(LocalDate.now());
        request.setStatus(StockRequestStatus.VALIDATED);
        StockTontineRequestItem item = new StockTontineRequestItem();
        item.setArticle(article);
        item.setItemName(article.getCommercialName() + " " + article.getName());
        item.setQuantity(quantity);
        item.setUnitPrice(article.getCreditSalePrice());
        item.setPurchasePrice(article.getPurchasePrice());
        request.addItem(item);
        return stockTontineRequestRepository.saveAndFlush(request);
    }
}
