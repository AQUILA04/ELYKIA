package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.inventory.application.StockReceptionService;
import com.optimize.elykia.inventory.application.StockValuationFacade;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.inventory.web.dto.StockReceptionDto;
import com.optimize.elykia.inventory.domain.ArticleHistory;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.core.entity.expense.ExpenseType;
import com.optimize.elykia.inventory.domain.StockReception;
import com.optimize.elykia.inventory.domain.StockReceptionItem;
import com.optimize.elykia.inventory.domain.ReceptionStatus;
import com.optimize.elykia.inventory.domain.StockHistoryReferenceType;
import com.optimize.elykia.inventory.domain.StockOperationType;
import com.optimize.elykia.inventory.web.mapper.StockReceptionMapper;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticleHistoryRepository;
import com.optimize.elykia.inventory.infrastructure.persistence.ArticlesRepository;
import com.optimize.elykia.core.repository.ExpenseTypeRepository;
import com.optimize.elykia.inventory.infrastructure.persistence.StockReceptionRepository;
import com.optimize.elykia.core.service.expense.ExpenseService;
import com.optimize.elykia.core.support.IntegrationTestSupport;
import com.optimize.elykia.shared.security.UserProfilConstant;
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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class StockReceptionTraceabilityIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private StockReceptionService stockReceptionService;
    @Autowired
    private ArticlesRepository articlesRepository;
    @Autowired
    private StockReceptionRepository stockReceptionRepository;
    @Autowired
    private ArticleHistoryRepository articleHistoryRepository;
    @Autowired
    private StockValuationFacade stockValuationFacade;
    @Autowired
    private EntityManager entityManager;
    @Autowired
    private ExpenseTypeRepository expenseTypeRepository;

    @MockitoBean
    private UserService userService;
    @MockitoBean
    private StockReceptionMapper stockReceptionMapper;
    @MockitoBean
    private ExpenseService expenseService;
    @MockitoBean
    private User currentUser;

    @Test
    void validateReception_persistsArticleQuantityValuationStatusAndTraceabilityAsOneBusinessOperation() {
        // Given
        Articles article = persistArticle("CHAINE-RECEPTION", 10, 100.0);
        persistApprovisionnementExpenseType();
        StockReception reception = persistPendingReception(article, 5, 120.0, "REC-CHAIN-001");
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("admin.stock");
        when(currentUser.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(true);
        when(stockReceptionMapper.toDto(any(StockReception.class))).thenReturn(new StockReceptionDto());

        // When
        stockReceptionService.validateReception(reception.getId(), null);
        entityManager.flush();
        entityManager.clear();

        // Then: article magasin et valorisation persistée au prix catalogue (100), pas au snapshot (120)
        Articles persistedArticle = articlesRepository.findById(article.getId()).orElseThrow();
        assertEquals(15, persistedArticle.getStockQuantity());
        assertEquals(100.0, persistedArticle.getPurchasePrice());
        assertEquals(LocalDate.now(), persistedArticle.getLastRestockDate());
        assertEquals(1_500.0, stockValuationFacade.getStockValuation(persistedArticle));

        // Then: agrégat opérationnel de réception valorisé au prix catalogue du jour
        StockReception persistedReception = stockReceptionRepository.findByIdWithItems(reception.getId()).orElseThrow();
        assertEquals(ReceptionStatus.VALIDATED, persistedReception.getStatus());
        assertEquals("admin.stock", persistedReception.getValidatedBy());
        assertNotNull(persistedReception.getValidatedAt());
        assertEquals(1, persistedReception.getItems().size());
        assertEquals(500.0, persistedReception.getTotalAmount());
        StockReceptionItem persistedItem = persistedReception.getItems().iterator().next();
        assertEquals(100.0, persistedItem.getUnitPrice());
        assertEquals(500.0, persistedItem.getTotalPrice());

        // Then: trace article explicitement reliée à la réception validée
        List<ArticleHistory> histories = articleHistoryRepository.findByArticles_IdOrderByIdDesc(article.getId());
        assertEquals(1, histories.size());
        ArticleHistory history = histories.get(0);
        assertEquals(StockOperationType.ENTREE, history.getOperationType());
        assertEquals(10, history.getInitialQuantity());
        assertEquals(5, history.getOperationQuantity());
        assertEquals(15, history.getFinalQuantity());
        assertEquals("admin.stock", history.getOperationUser());
        assertEquals("admin.stock", history.getBeneficiary());
        assertEquals(StockHistoryReferenceType.STOCK_RECEPTION, history.getReferenceType());
        assertEquals(reception.getId(), history.getReferenceId());
        assertEquals("REC-CHAIN-001", history.getReferenceLabel());
        assertTrue(history.getOccurredAt() != null && !history.getOccurredAt().isAfter(java.time.LocalDateTime.now()));
    }

    private void persistApprovisionnementExpenseType() {
        if (expenseTypeRepository.findByName("Approvisionnement").isPresent()) {
            return;
        }
        ExpenseType expenseType = new ExpenseType();
        expenseType.setName("Approvisionnement");
        expenseType.setCode("APPROVISIONNEMENT");
        expenseType.setDescription("Dépenses liées à l'approvisionnement");
        expenseTypeRepository.saveAndFlush(expenseType);
    }

    private Articles persistArticle(String name, int quantity, double purchasePrice) {
        Articles article = new Articles();
        article.setName(name);
        article.setType("PACK");
        article.setMarque("Elykia");
        article.setModel("M-CHAIN");
        article.setStockQuantity(quantity);
        article.setPurchasePrice(purchasePrice);
        article.setSellingPrice(150.0);
        article.setCreditSalePrice(180.0);
        return articlesRepository.saveAndFlush(article);
    }

    private StockReception persistPendingReception(Articles article, int quantity, double unitPrice, String reference) {
        StockReception reception = new StockReception();
        reception.setReference(reference);
        reception.setReceptionDate(LocalDate.now());
        reception.setReceivedBy("magasinier.a");
        reception.setStatus(ReceptionStatus.PENDING);
        reception.setTotalAmount(0.0);

        StockReceptionItem item = new StockReceptionItem();
        item.setArticle(article);
        item.setQuantity(quantity);
        item.setUnitPrice(unitPrice);
        item.setTotalPrice(unitPrice * quantity);
        reception.addItem(item);
        return stockReceptionRepository.saveAndFlush(reception);
    }
}
