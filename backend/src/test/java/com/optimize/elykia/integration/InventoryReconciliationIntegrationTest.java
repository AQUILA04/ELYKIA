package com.optimize.elykia.integration;

import com.optimize.elykia.inventory.application.InventoryReconciliationService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.inventory.domain.ArticleHistory;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.inventory.domain.Inventory;
import com.optimize.elykia.inventory.domain.InventoryItem;
import com.optimize.elykia.inventory.domain.InventoryReconciliation;
import com.optimize.elykia.inventory.domain.StockMovement;
import com.optimize.elykia.inventory.domain.InventoryItemStatus;
import com.optimize.elykia.inventory.domain.MovementType;
import com.optimize.elykia.inventory.domain.ReconciliationAction;
import com.optimize.elykia.inventory.domain.ReconciliationType;
import com.optimize.elykia.inventory.domain.StockHistoryReferenceType;
import com.optimize.elykia.inventory.domain.StockOperationType;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticleHistoryRepository;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticlesRepository;
import com.optimize.elykia.inventory.infrastructure.persistence.InventoryItemRepository;
import com.optimize.elykia.inventory.infrastructure.persistence.InventoryReconciliationRepository;
import com.optimize.elykia.inventory.infrastructure.persistence.InventoryRepository;
import com.optimize.elykia.inventory.infrastructure.persistence.StockMovementRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
// Le Postgres de test est partagé. Sans retour arrière, l'inventaire DRAFT bloque les autres tests.
@Transactional
class InventoryReconciliationIntegrationTest extends IntegrationTestSupport {

    @Autowired private InventoryReconciliationService reconciliationService;
    @Autowired private ArticlesRepository articlesRepository;
    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private InventoryItemRepository inventoryItemRepository;
    @Autowired private InventoryReconciliationRepository reconciliationRepository;
    @Autowired private ArticleHistoryRepository articleHistoryRepository;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private EntityManager entityManager;

    @MockitoBean private UserService userService;
    @MockitoBean private User currentUser;

    @Test
    void adjustStockToPhysical_reconcilesDebtAndPersistsArticleAndWarehouseLedgersAsOneOperation() {
        // Given: the physical count reveals a debt of three units for an article with ten units in store
        Articles article = persistArticle("INVENTAIRE-CHAIN", 10);
        Inventory inventory = persistInventory();
        InventoryItem debtItem = persistInventoryItem(inventory, article, 10, 7);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("inventoriste.chain");

        // When: the debt is adjusted to the physical quantity
        reconciliationService.adjustStockToPhysical(debtItem.getId(), "comptage physique validé");
        entityManager.clear();

        // Then: the article and inventory item carry the reconciled quantity and state
        Articles persistedArticle = articlesRepository.findById(article.getId()).orElseThrow();
        assertEquals(7, persistedArticle.getStockQuantity());
        InventoryItem persistedItem = inventoryItemRepository.findById(debtItem.getId()).orElseThrow();
        assertEquals(InventoryItemStatus.RECONCILED, persistedItem.getStatus());
        assertEquals("comptage physique validé", persistedItem.getReconciliationComment());
        assertEquals("inventoriste.chain", persistedItem.getReconciledBy());
        assertEquals(true, persistedItem.getDebtCancelled());
        assertEquals(false, persistedItem.getMarkAsDebt());

        // Then: reconciliation record carries the same before/after values and the explicit error-correction action
        List<InventoryReconciliation> reconciliations = reconciliationRepository
                .findByInventoryItemIdOrderByPerformedAtDesc(debtItem.getId());
        assertEquals(1, reconciliations.size());
        InventoryReconciliation reconciliation = reconciliations.get(0);
        assertEquals(10, reconciliation.getStockBefore());
        assertEquals(7, reconciliation.getStockAfter());
        assertEquals(ReconciliationType.ERROR_CORRECTION, reconciliation.getReconciliationType());
        assertEquals(ReconciliationAction.ADJUST_TO_PHYSICAL, reconciliation.getAction());
        assertEquals("inventoriste.chain", reconciliation.getPerformedBy());

        // Then: ArticleHistory and warehouse ledger preserve the adjustment, actor and inventory reference
        List<ArticleHistory> histories = articleHistoryRepository.findByArticles_IdOrderByIdDesc(article.getId());
        assertEquals(1, histories.size());
        ArticleHistory history = histories.get(0);
        assertEquals(StockOperationType.INVENTORY_ADJUSTMENT, history.getOperationType());
        assertEquals(10, history.getInitialQuantity());
        assertEquals(3, history.getOperationQuantity());
        assertEquals(7, history.getFinalQuantity());
        assertEquals("inventoriste.chain", history.getOperationUser());
        assertEquals(StockHistoryReferenceType.INVENTORY, history.getReferenceType());
        assertEquals(inventory.getId(), history.getReferenceId());
        assertEquals("Inventaire #" + inventory.getId(), history.getReferenceLabel());
        assertEquals("inventoriste.chain", history.getBeneficiary());

        List<StockMovement> movements = stockMovementRepository.findByArticleIdOrderByMovementDateDesc(article.getId());
        assertEquals(1, movements.size());
        StockMovement movement = movements.get(0);
        assertEquals(MovementType.INVENTORY_ADJUSTMENT, movement.getType());
        assertEquals(10, movement.getStockBefore());
        assertEquals(3, movement.getQuantity());
        assertEquals(7, movement.getStockAfter());
        assertEquals("inventoriste.chain", movement.getPerformedBy());
        assertNotNull(movement.getMovementDate());
    }

    private Articles persistArticle(String name, int stock) {
        Articles article = new Articles();
        article.setName(name);
        article.setType("PACK");
        article.setMarque("Elykia");
        article.setModel("M-INVENTAIRE");
        article.setStockQuantity(stock);
        article.setPurchasePrice(800.0);
        article.setSellingPrice(1_200.0);
        article.setCreditSalePrice(1_500.0);
        return articlesRepository.saveAndFlush(article);
    }

    private Inventory persistInventory() {
        Inventory inventory = new Inventory();
        inventory.setInventoryDate(LocalDate.now());
        inventory.setCreatedByUser("inventoriste.chain");
        return inventoryRepository.saveAndFlush(inventory);
    }

    private InventoryItem persistInventoryItem(Inventory inventory, Articles article, int systemQuantity, int physicalQuantity) {
        InventoryItem item = new InventoryItem();
        item.setInventory(inventory);
        item.setArticle(article);
        item.setSystemQuantity(systemQuantity);
        item.setPhysicalQuantity(physicalQuantity);
        item.calculateDifference();
        return inventoryItemRepository.saveAndFlush(item);
    }
}
