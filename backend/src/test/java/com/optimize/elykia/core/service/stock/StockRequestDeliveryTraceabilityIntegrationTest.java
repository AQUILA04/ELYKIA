package com.optimize.elykia.core.service.stock;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.article.ArticleHistory;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.stock.CommercialStockMovement;
import com.optimize.elykia.core.entity.stock.StockMovement;
import com.optimize.elykia.core.entity.stock.StockRequest;
import com.optimize.elykia.core.entity.stock.StockRequestItem;
import com.optimize.elykia.core.dto.PartialDeliveryResponseDTO;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.enumaration.StockHistoryReferenceType;
import com.optimize.elykia.core.enumaration.StockOperationType;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import com.optimize.elykia.core.repository.ArticleHistoryRepository;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.CommercialStockMovementRepository;
import com.optimize.elykia.core.repository.StockMovementRepository;
import com.optimize.elykia.core.repository.StockRequestRepository;
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
class StockRequestDeliveryTraceabilityIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private StockRequestService stockRequestService;
    @Autowired
    private ArticlesRepository articlesRepository;
    @Autowired
    private StockRequestRepository stockRequestRepository;
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
    void deliverRequest_persistsWarehouseLedgerHistoryAndCommercialMonthlyStockAsOneBusinessOperation() {
        // Given
        Articles article = persistArticle("CHAINE-LIVRAISON", 10, 800.0, 1_500.0);
        StockRequest request = persistValidatedRequest(article, 3, "REQ-CHAIN-001", "commercial.chain");
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("magasinier.chain");

        // When
        stockRequestService.deliverRequest(request.getId());
        entityManager.flush();
        entityManager.clear();

        // Then: stock magasin, statut de la demande et prix définitivement appliqués
        Articles persistedArticle = articlesRepository.findById(article.getId()).orElseThrow();
        assertEquals(7, persistedArticle.getStockQuantity());
        StockRequest delivered = stockRequestRepository.findByIdWithItems(request.getId()).orElseThrow();
        assertEquals(StockRequestStatus.DELIVERED, delivered.getStatus());
        assertEquals(LocalDate.now(), delivered.getDeliveryDate());
        assertEquals(LocalDate.now(), delivered.getAccountingDate());
        assertEquals(LocalDate.now().getMonthValue(), delivered.getMonth());
        assertEquals(LocalDate.now().getYear(), delivered.getYear());
        StockRequestItem deliveredItem = delivered.getItems().iterator().next();
        assertEquals(3, deliveredItem.getQuantity());
        assertEquals(1_500.0, deliveredItem.getUnitPrice());
        assertEquals(800.0, deliveredItem.getPurchasePrice());
        assertEquals(4_500.0, delivered.getTotalCreditSalePrice());
        assertEquals(2_400.0, delivered.getTotalPurchasePrice());

        // Then: ledger magasin cohérent avec la mutation article
        List<StockMovement> warehouseMovements = stockMovementRepository.findByArticleIdOrderByMovementDateDesc(article.getId());
        assertEquals(1, warehouseMovements.size());
        StockMovement warehouseMovement = warehouseMovements.get(0);
        assertEquals(MovementType.RELEASE, warehouseMovement.getType());
        assertEquals(10, warehouseMovement.getStockBefore());
        assertEquals(3, warehouseMovement.getQuantity());
        assertEquals(7, warehouseMovement.getStockAfter());
        assertEquals(800.0, warehouseMovement.getUnitCost());
        assertEquals("magasinier.chain", warehouseMovement.getPerformedBy());
        assertEquals("Livraison demande REQ-CHAIN-001", warehouseMovement.getReason());

        // Then: ArticleHistory porte la même variation et la référence métier de demande
        List<ArticleHistory> histories = articleHistoryRepository.findByArticles_IdOrderByIdDesc(article.getId());
        assertEquals(1, histories.size());
        ArticleHistory history = histories.get(0);
        assertEquals(StockOperationType.SORTIE, history.getOperationType());
        assertEquals(10, history.getInitialQuantity());
        assertEquals(3, history.getOperationQuantity());
        assertEquals(7, history.getFinalQuantity());
        assertEquals("magasinier.chain", history.getOperationUser());
        assertEquals("commercial.chain", history.getBeneficiary());
        assertEquals(StockHistoryReferenceType.STOCK_REQUEST, history.getReferenceType());
        assertEquals(request.getId(), history.getReferenceId());
        assertEquals("REQ-CHAIN-001", history.getReferenceLabel());

        // Then: agrégat du commercial enregistré pour la période de livraison, sans toucher une autre période
        CommercialMonthlyStock monthlyStock = monthlyStockRepository
                .findByCollectorAndMonthAndYear("commercial.chain", LocalDate.now().getMonthValue(), LocalDate.now().getYear())
                .orElseThrow();
        assertEquals("commercial.chain", monthlyStock.getCollector());
        assertEquals(LocalDate.now().getMonthValue(), monthlyStock.getMonth());
        assertEquals(LocalDate.now().getYear(), monthlyStock.getYear());
        assertEquals(1, monthlyStock.getItems().size());
        CommercialMonthlyStockItem monthlyItem = monthlyStock.getItems().iterator().next();
        assertEquals(article.getId(), monthlyItem.getArticle().getId());
        assertEquals(3, monthlyItem.getQuantityTaken());
        assertEquals(0, monthlyItem.getQuantitySold());
        assertEquals(0, monthlyItem.getQuantityReturned());
        assertEquals(3, monthlyItem.getQuantityRemaining());
        assertEquals(1_500.0, monthlyItem.getWeightedAverageUnitPrice());
        assertEquals(800.0, monthlyItem.getWeightedAveragePurchasePrice());
        assertEquals(1_500.0, monthlyItem.getLastUnitPrice());
        assertEquals(800.0, monthlyItem.getLastPurchasePrice());

        // Then: mouvement commercial relié à la demande et aux mêmes quantités
        List<CommercialStockMovement> commercialMovements = commercialStockMovementRepository
                .findByCollectorAndMovementTypeOrderByOperationDateDesc("commercial.chain", CommercialStockMovementType.STOCK_IN);
        assertEquals(1, commercialMovements.size());
        CommercialStockMovement commercialMovement = commercialMovements.get(0);
        assertEquals(monthlyItem.getId(), commercialMovement.getStockItem().getId());
        assertEquals(article.getId(), commercialMovement.getArticle().getId());
        assertEquals(0, commercialMovement.getQuantityBefore());
        assertEquals(3, commercialMovement.getQuantityMoved());
        assertEquals(3, commercialMovement.getQuantityAfter());
        assertEquals(800.0, commercialMovement.getUnitPurchasePrice());
        assertEquals(1_500.0, commercialMovement.getUnitSalePrice());
        assertEquals(2_100.0, commercialMovement.getMarginAmount());
        assertEquals("STOCK_REQUEST", commercialMovement.getSourceType());
        assertEquals(request.getId(), commercialMovement.getSourceId());
        assertNotNull(commercialMovement.getOperationDate());
        assertTrue(commercialMovement.getOperationDate().toLocalDate().equals(LocalDate.now()));
    }

    @Test
    void deliverRequest_partialDeliveryPersistsOnlyDeliveredImpactsAndIsolatesTheRemainingQuantities() {
        // Given
        Articles partiallyAvailableArticle = persistArticle("CHAINE-PARTIEL-A", 2, 700.0, 1_400.0);
        Articles unavailableArticle = persistArticle("CHAINE-PARTIEL-B", 0, 900.0, 1_800.0);
        StockRequest request = new StockRequest();
        request.setReference("REQ-CHAIN-PARTIAL-001");
        request.setCollector("commercial.partial");
        request.setRequestDate(LocalDate.now());
        request.setStatus(StockRequestStatus.VALIDATED);
        request.addItem(requestItem(partiallyAvailableArticle, 3));
        request.addItem(requestItem(unavailableArticle, 4));
        request = stockRequestRepository.saveAndFlush(request);
        Long originalRequestId = request.getId();
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("magasinier.partial");

        // When
        PartialDeliveryResponseDTO response = stockRequestService.deliverRequest(request.getId());
        entityManager.flush();
        entityManager.clear();

        // Then: seule la quantité disponible est sortie du magasin
        assertEquals(PartialDeliveryResponseDTO.DeliveryType.PARTIAL, response.getDeliveryType());
        assertEquals(0, articlesRepository.findById(partiallyAvailableArticle.getId()).orElseThrow().getStockQuantity());
        assertEquals(0, articlesRepository.findById(unavailableArticle.getId()).orElseThrow().getStockQuantity());

        // Then: la demande initiale ne contient que la partie livrée et son agrégat commercial est limité à celle-ci
        StockRequest delivered = stockRequestRepository.findByIdWithItems(request.getId()).orElseThrow();
        assertEquals(StockRequestStatus.DELIVERED, delivered.getStatus());
        assertEquals(1, delivered.getItems().size());
        StockRequestItem deliveredItem = delivered.getItems().iterator().next();
        assertEquals(partiallyAvailableArticle.getId(), deliveredItem.getArticle().getId());
        assertEquals(2, deliveredItem.getQuantity());
        assertEquals(2_800.0, delivered.getTotalCreditSalePrice());
        assertEquals(1_400.0, delivered.getTotalPurchasePrice());
        CommercialMonthlyStock monthlyStock = monthlyStockRepository
                .findByCollectorAndMonthAndYear("commercial.partial", LocalDate.now().getMonthValue(), LocalDate.now().getYear())
                .orElseThrow();
        assertEquals(1, monthlyStock.getItems().size());
        CommercialMonthlyStockItem monthlyItem = monthlyStock.getItems().iterator().next();
        assertEquals(partiallyAvailableArticle.getId(), monthlyItem.getArticle().getId());
        assertEquals(2, monthlyItem.getQuantityTaken());
        assertEquals(2, monthlyItem.getQuantityRemaining());

        // Then: la demande validée de reliquat conserve séparément les quantités non livrées
        StockRequest pendingRequest = stockRequestRepository.findAll().stream()
                .filter(candidate -> !candidate.getId().equals(originalRequestId))
                .findFirst()
                .orElseThrow();
        StockRequest reloadedPendingRequest = stockRequestRepository.findByIdWithItems(pendingRequest.getId()).orElseThrow();
        assertEquals(StockRequestStatus.VALIDATED, reloadedPendingRequest.getStatus());
        assertEquals(2, reloadedPendingRequest.getItems().size());
        assertEquals(5, reloadedPendingRequest.getItems().stream().mapToInt(StockRequestItem::getQuantity).sum());
        assertEquals(1, reloadedPendingRequest.getItems().stream()
                .filter(item -> item.getArticle().getId().equals(partiallyAvailableArticle.getId()))
                .findFirst().orElseThrow().getQuantity());
        assertEquals(4, reloadedPendingRequest.getItems().stream()
                .filter(item -> item.getArticle().getId().equals(unavailableArticle.getId()))
                .findFirst().orElseThrow().getQuantity());

        // Then: aucune trace magasin ou commerciale n’est créée pour l’article non livré
        assertEquals(1, stockMovementRepository.findByArticleIdOrderByMovementDateDesc(partiallyAvailableArticle.getId()).size());
        assertEquals(0, stockMovementRepository.findByArticleIdOrderByMovementDateDesc(unavailableArticle.getId()).size());
        assertEquals(1, articleHistoryRepository.findByArticles_IdOrderByIdDesc(partiallyAvailableArticle.getId()).size());
        assertEquals(0, articleHistoryRepository.findByArticles_IdOrderByIdDesc(unavailableArticle.getId()).size());
        assertEquals(1, commercialStockMovementRepository
                .findByCollectorAndMovementTypeOrderByOperationDateDesc("commercial.partial", CommercialStockMovementType.STOCK_IN)
                .size());
    }

    private StockRequestItem requestItem(Articles article, int quantity) {
        StockRequestItem item = new StockRequestItem();
        item.setArticle(article);
        item.setItemName(article.getCommercialName() + " " + article.getName());
        item.setQuantity(quantity);
        item.setUnitPrice(article.getCreditSalePrice());
        item.setPurchasePrice(article.getPurchasePrice());
        return item;
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

    private StockRequest persistValidatedRequest(Articles article, int quantity, String reference, String collector) {
        StockRequest request = new StockRequest();
        request.setReference(reference);
        request.setCollector(collector);
        request.setRequestDate(LocalDate.now());
        request.setStatus(StockRequestStatus.VALIDATED);
        StockRequestItem item = new StockRequestItem();
        item.setArticle(article);
        item.setItemName(article.getCommercialName() + " " + article.getName());
        item.setQuantity(quantity);
        item.setUnitPrice(article.getCreditSalePrice());
        item.setPurchasePrice(article.getPurchasePrice());
        request.addItem(item);
        return stockRequestRepository.saveAndFlush(request);
    }
}
