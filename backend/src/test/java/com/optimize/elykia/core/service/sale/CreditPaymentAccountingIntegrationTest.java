package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.core.dto.CollectorDailyStakeDto;
import com.optimize.elykia.core.dto.CreditRespDto;
import com.optimize.elykia.core.dto.DefaultDailyStakeUnitDto;
import com.optimize.elykia.core.dto.DistributeArticleDto;
import com.optimize.elykia.core.dto.StockEntry;
import com.optimize.elykia.core.dto.StockEntryDto;
import com.optimize.elykia.core.entity.accounting.DailyAccounting;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.stock.CommercialStockMovement;
import com.optimize.elykia.core.enumaration.AccountingDayStatus;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.CommercialStockMovementRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.service.accounting.DailyAccountingService;
import com.optimize.elykia.core.support.IntegrationTestSupport;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@ActiveProfiles("test")
class CreditPaymentAccountingIntegrationTest extends IntegrationTestSupport {

    private static final String COLLECTOR = "commercial.credit.chain";
    private static final String CREDIT_REFERENCE = "CR-CHAIN-INT-001";
    private static final String RECOVERY_REFERENCE = "REC-CHAIN-INT-001";

    @Autowired private CreditService creditService;
    @Autowired private CreditTimelineService creditTimelineService;
    @Autowired private DailyAccountingService dailyAccountingService;
    @Autowired private ArticlesRepository articlesRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private CreditRepository creditRepository;
    @Autowired private CreditTimelineRepository timelineRepository;
    @Autowired private CommercialMonthlyStockRepository monthlyStockRepository;
    @Autowired private CommercialStockMovementRepository commercialStockMovementRepository;
    @Autowired private EntityManager entityManager;

    @Test
    void distributeCredit_thenCollectAndCloseAccounting_persistsOneConsistentBusinessChain() {
        // Given: a client and a commercial monthly stock line containing four units available for credit sale.
        LocalDate accountingDate = LocalDate.now();
        double baselineCollected = amountOrZero(timelineRepository.sumAmountByDate(
                accountingDate.atStartOfDay(), accountingDate.atTime(23, 59, 59)));
        Articles article = persistArticle("CREDIT-CHAIN-ARTICLE", 10, 800.0, 1_500.0);
        Client client = persistClient("client.credit.chain");
        CommercialMonthlyStockItem stockItem = persistCommercialStock(article, 4, 1_500.0, 800.0);
        DistributeArticleDto distribution = distribution(client.getId(), article.getId(), 2, CREDIT_REFERENCE);

        // When: the commercial distributes two units on credit, records the same mobile recovery twice, then closes the day.
        CreditRespDto created = creditService.distributeArticlesV2(distribution);
        creditTimelineService.defaultDailyStakeByCollector(sync(created.id(), RECOVERY_REFERENCE));
        creditTimelineService.defaultDailyStakeByCollector(sync(created.id(), RECOVERY_REFERENCE));
        DailyAccounting closed = dailyAccountingService.closeDailyAccounting(accountingDate);
        entityManager.clear();

        // Then: the warehouse article is untouched because this sale consumes the already delivered commercial stock.
        Articles persistedArticle = articlesRepository.findById(article.getId()).orElseThrow();
        assertEquals(10, persistedArticle.getStockQuantity());

        // Then: the credit has deterministic financial terms and remains active after one real daily payment.
        Credit credit = creditRepository.findById(created.id()).orElseThrow();
        assertEquals(CREDIT_REFERENCE, credit.getReference());
        assertEquals(CreditStatus.INPROGRESS, credit.getStatus());
        assertEquals(3_000.0, credit.getTotalAmount());
        assertEquals(1_600.0, credit.getTotalPurchase());
        assertEquals(200.0, credit.getDailyStake());
        assertEquals(200.0, credit.getTotalAmountPaid());
        assertEquals(2_800.0, credit.getTotalAmountRemaining());
        assertEquals(COLLECTOR, credit.getCollector());
        assertEquals(client.getId(), credit.getClient().getId());

        // Then: exactly one recovery timeline is persisted despite replay, and it belongs to the current accounting day.
        List<CreditTimeline> timelines = timelineRepository.findByCredit_id(credit.getId());
        assertEquals(1, timelines.size());
        CreditTimeline timeline = timelineRepository.findByReference(RECOVERY_REFERENCE).orElseThrow();
        assertEquals(credit.getId(), timeline.getCredit().getId());
        assertEquals(COLLECTOR, timeline.getCollector());
        assertEquals(200.0, timeline.getAmount());
        assertEquals(0.0, timeline.getReliquatGeneratedAmount());
        assertEquals(0.0, timeline.getReliquatUsedAmount());
        assertNotNull(timeline.getDailyAccountancy());

        // Then: the commercial aggregate and its ledger expose the same exact credit-sale variation.
        CommercialMonthlyStock persistedMonthlyStock = monthlyStockRepository
                .findByIdWithItems(stockItem.getMonthlyStock().getId())
                .orElseThrow();
        CommercialMonthlyStockItem persistedItem = persistedMonthlyStock.getItems().stream()
                .filter(item -> item.getId().equals(stockItem.getId()))
                .findFirst()
                .orElseThrow();
        assertEquals(4, persistedItem.getQuantityTaken());
        assertEquals(2, persistedItem.getQuantitySold());
        assertEquals(0, persistedItem.getQuantityReturned());
        assertEquals(2, persistedItem.getQuantityRemaining());
        assertEquals(3_000.0, persistedItem.getTotalSoldValue());
        assertEquals(1_400.0, persistedItem.getTotalMargeValue());
        assertEquals(1_500.0, persistedItem.getWeightedAverageUnitPrice());
        assertEquals(800.0, persistedItem.getWeightedAveragePurchasePrice());

        CommercialStockMovement commercialMovement = commercialStockMovementRepository
                .findByCollectorAndMovementTypeOrderByOperationDateDesc(COLLECTOR, CommercialStockMovementType.CREDIT_SALE)
                .stream()
                .filter(movement -> credit.getId().equals(movement.getCreditId()))
                .findFirst()
                .orElseThrow();
        assertEquals(persistedItem.getId(), commercialMovement.getStockItem().getId());
        assertEquals(article.getId(), commercialMovement.getArticle().getId());
        assertEquals(CREDIT_REFERENCE, commercialMovement.getCreditReference());
        assertEquals(4, commercialMovement.getQuantityBefore());
        assertEquals(2, commercialMovement.getQuantityMoved());
        assertEquals(2, commercialMovement.getQuantityAfter());
        assertEquals(800.0, commercialMovement.getUnitPurchasePrice());
        assertEquals(1_500.0, commercialMovement.getUnitSalePrice());
        assertEquals(1_400.0, commercialMovement.getMarginAmount());
        assertEquals("CREDIT", commercialMovement.getSourceType());
        assertEquals(credit.getId(), commercialMovement.getSourceId());

        // Then: closing totals only the persisted, idempotent payment once.
        assertNotNull(closed);
        DailyAccounting persistedDay = dailyAccountingService.getByAccountingDate(accountingDate);
        assertEquals(AccountingDayStatus.OLD, persistedDay.getStatus());
        assertEquals(baselineCollected + 200.0, persistedDay.getTotalAmount());
    }

    private double amountOrZero(Double amount) {
        return amount != null ? amount : 0.0;
    }

    private CollectorDailyStakeDto sync(Long creditId, String recoveryReference) {
        DefaultDailyStakeUnitDto unit = new DefaultDailyStakeUnitDto();
        unit.setCreditId(creditId);
        unit.setRecoveryId(recoveryReference);
        unit.setConfirmedAmount(200.0);
        unit.setOperationConsentCode("consent-" + recoveryReference);

        CollectorDailyStakeDto dto = new CollectorDailyStakeDto();
        dto.setCollector(COLLECTOR);
        dto.setSyncConsentCode("sync-" + recoveryReference);
        dto.setStakeUnits(List.of(unit));
        return dto;
    }

    private DistributeArticleDto distribution(Long clientId, Long articleId, int quantity, String reference) {
        StockEntry entry = new StockEntry();
        entry.setArticleId(articleId);
        entry.setQuantity(quantity);
        StockEntryDto articles = new StockEntryDto();
        articles.setArticleEntries(Set.of(entry));

        DistributeArticleDto dto = new DistributeArticleDto();
        dto.setClientId(clientId);
        dto.setArticles(articles);
        dto.setReference(reference);
        return dto;
    }

    private Articles persistArticle(String name, int warehouseQuantity, double purchasePrice, double creditSalePrice) {
        Articles article = new Articles();
        article.setName(name);
        article.setType("PACK");
        article.setMarque("Elykia");
        article.setModel("CREDIT-CHAIN");
        article.setStockQuantity(warehouseQuantity);
        article.setPurchasePrice(purchasePrice);
        article.setSellingPrice(1_200.0);
        article.setCreditSalePrice(creditSalePrice);
        return articlesRepository.saveAndFlush(article);
    }

    private Client persistClient(String code) {
        Client client = new Client();
        client.setFirstname("Client");
        client.setLastname("Credit Chain");
        client.setCode(code);
        client.setPhone("0700000123");
        client.setCollector(COLLECTOR);
        client.setClientType(ClientType.CLIENT);
        client.setCreditInProgress(false);
        return clientRepository.saveAndFlush(client);
    }

    private CommercialMonthlyStockItem persistCommercialStock(
            Articles article, int quantityTaken, double saleUnitPrice, double purchaseUnitPrice) {
        CommercialMonthlyStock stock = new CommercialMonthlyStock();
        stock.setCollector(COLLECTOR);
        stock.setMonth(LocalDate.now().getMonthValue());
        stock.setYear(LocalDate.now().getYear());

        CommercialMonthlyStockItem item = new CommercialMonthlyStockItem();
        item.setArticle(article);
        item.setQuantityTaken(quantityTaken);
        item.setQuantitySold(0);
        item.setQuantityReturned(0);
        item.setWeightedAverageUnitPrice(saleUnitPrice);
        item.setWeightedAveragePurchasePrice(purchaseUnitPrice);
        item.setLastUnitPrice(saleUnitPrice);
        item.setLastPurchasePrice(purchaseUnitPrice);
        item.setTotalSoldValue(0.0);
        item.setTotalMargeValue(0.0);
        item.updateRemaining();
        stock.addItem(item);

        return monthlyStockRepository.saveAndFlush(stock).getItems().iterator().next();
    }
}
