package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.dto.stock.CreditSoldAmountOnStockProjection;
import com.optimize.elykia.core.dto.stock.StockRecoverySummaryDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CommercialMonthlyStockItemSoldValueHistoryRepository;
import com.optimize.elykia.core.repository.CreditArticlesRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialMonthlyStockRecoveryServiceTest {

    @Mock
    private CommercialMonthlyStockItemSoldValueHistoryRepository soldValueHistoryRepository;

    @Mock
    private CreditArticlesRepository creditArticlesRepository;

    @Mock
    private CreditRepository creditRepository;

    private CommercialMonthlyStockRecoveryService service;

    @BeforeEach
    void setUp() {
        service = new CommercialMonthlyStockRecoveryService(
                soldValueHistoryRepository, creditArticlesRepository, creditRepository);
    }

    @Test
    void aggregatesRecoveryUsingCreditTotalsAndSoldHistoryWeights() {
        CommercialMonthlyStock stock = buildCreditRecoveryStock();

        when(soldValueHistoryRepository.sumSoldValueByCreditForStockItems(any()))
                .thenReturn(List.of(projection(100L, 60_000D), projection(200L, 40_000D)));
        when(creditArticlesRepository.sumSoldValueByCreditForStockItemIds(any())).thenReturn(List.of());
        when(creditArticlesRepository.findCreditIdsByStockItemIds(any()))
                .thenReturn(List.of(100L, 200L));

        Credit credit100 = credit(100L, 60_000D, 20_000D, 40_000D);
        Credit credit200 = credit(200L, 40_000D, 40_000D, 0D);
        when(creditRepository.findAllById(Set.of(100L, 200L))).thenReturn(List.of(credit100, credit200));

        StockRecoverySummaryDto summary = service.aggregate(stock);

        assertEquals(150_000D, summary.getTotalDueAmount());
        assertEquals(60_000D, summary.getTotalRecoveredAmount());
        assertEquals(90_000D, summary.getTotalRemainingAmount());
        assertEquals(50_000D, summary.getRemainingFromPhysicalStock());
        assertEquals(40_000D, summary.getRemainingFromCredits());
        assertEquals(40D, summary.getRecoveryRatePercent());
    }

    @Test
    void usesFullCreditAmountWhenExclusiveToStockWithoutHistory() {
        CommercialMonthlyStock stock = buildCreditRecoveryStock();

        when(soldValueHistoryRepository.sumSoldValueByCreditForStockItems(any()))
                .thenReturn(List.of());
        when(creditArticlesRepository.sumSoldValueByCreditForStockItemIds(any())).thenReturn(List.of());
        when(creditArticlesRepository.findCreditIdsByStockItemIds(any()))
                .thenReturn(List.of(300L));
        when(creditArticlesRepository.countLinkedArticlesOnStockItems(eq(300L), any())).thenReturn(2L);
        when(creditArticlesRepository.countLinkedArticlesOutsideStockItems(eq(300L), any())).thenReturn(0L);

        Credit credit300 = credit(300L, 100_000D, 25_000D, 75_000D);
        when(creditRepository.findAllById(Set.of(300L))).thenReturn(List.of(credit300));

        StockRecoverySummaryDto summary = service.aggregate(stock);

        assertEquals(25_000D, summary.getTotalRecoveredAmount());
        assertEquals(125_000D, summary.getTotalRemainingAmount());
        assertEquals(75_000D, summary.getRemainingFromCredits());
    }

    @Test
    void aggregatesFullRecoveryForCashSalesLinkedByStockItemId() {
        CommercialMonthlyStock stock = buildCashRecoveryStock();

        when(soldValueHistoryRepository.sumSoldValueByCreditForStockItems(any()))
                .thenReturn(List.of(projection(401L, 500D), projection(402L, 2_500D)));
        when(creditArticlesRepository.sumSoldValueByCreditForStockItemIds(any())).thenReturn(List.of());
        when(creditArticlesRepository.findCreditIdsByStockItemIds(any()))
                .thenReturn(List.of(401L, 402L));

        Credit cash500 = cashCredit(401L, 500D);
        Credit cash2500 = cashCredit(402L, 2_500D);
        when(creditRepository.findAllById(Set.of(401L, 402L))).thenReturn(List.of(cash500, cash2500));

        StockRecoverySummaryDto summary = service.aggregate(stock);

        assertEquals(3_000D, summary.getTotalRecoveredAmount());
        assertEquals(0D, summary.getTotalRemainingAmount());
        assertEquals(100D, summary.getRecoveryRatePercent());
    }

    @Test
    void excludesRattrapageCreditLinkedToPreviousMonthStock() {
        CommercialMonthlyStock stock = buildCreditRecoveryStock();

        when(soldValueHistoryRepository.sumSoldValueByCreditForStockItems(any())).thenReturn(List.of());
        when(creditArticlesRepository.sumSoldValueByCreditForStockItemIds(any())).thenReturn(List.of());
        when(creditArticlesRepository.findCreditIdsByStockItemIds(any())).thenReturn(List.of(900L));

        Credit rattrapage = credit(900L, 47_000D, 10_000D, 37_000D);
        rattrapage.setReference("RAT-TEST1234");
        when(creditRepository.findAllById(Set.of(900L))).thenReturn(List.of(rattrapage));
        when(creditArticlesRepository.countLinkedArticlesOnStockItems(eq(900L), any())).thenReturn(0L);

        StockRecoverySummaryDto summary = service.aggregate(stock);

        assertEquals(0D, summary.getTotalRecoveredAmount());
        assertEquals(150_000D, summary.getTotalRemainingAmount());
    }

    @Test
    void enforcesRecoveredPlusRemainingEqualsTotalDueWhenAttributionExceedsStockSoldValue() {
        CommercialMonthlyStock stock = buildCashRecoveryStock();

        when(soldValueHistoryRepository.sumSoldValueByCreditForStockItems(any()))
                .thenReturn(List.of(projection(401L, 2_000D), projection(402L, 2_000D)));
        when(creditArticlesRepository.sumSoldValueByCreditForStockItemIds(any())).thenReturn(List.of());
        when(creditArticlesRepository.findCreditIdsByStockItemIds(any()))
                .thenReturn(List.of(401L, 402L));

        when(creditRepository.findAllById(Set.of(401L, 402L)))
                .thenReturn(List.of(cashCredit(401L, 2_000D), cashCredit(402L, 2_000D)));

        StockRecoverySummaryDto summary = service.aggregate(stock);

        assertEquals(3_000D, summary.getTotalDueAmount());
        assertEquals(3_000D, summary.getTotalRecoveredAmount() + summary.getTotalRemainingAmount());
    }

    private static CommercialMonthlyStock buildCreditRecoveryStock() {
        CommercialMonthlyStock stock = new CommercialMonthlyStock();
        stock.setCollector("COM001");
        stock.setMonth(6);
        stock.setYear(2026);

        CommercialMonthlyStockItem item1 = stockItem(10L, new Articles(), 2, 25_000D, 50_000D);
        CommercialMonthlyStockItem item2 = stockItem(11L, new Articles(), 0, 0D, 50_000D);
        stock.setItems(Set.of(item1, item2));
        return stock;
    }

    private static CommercialMonthlyStock buildCashRecoveryStock() {
        CommercialMonthlyStock stock = new CommercialMonthlyStock();
        stock.setCollector("COM001");
        stock.setMonth(6);
        stock.setYear(2026);

        Articles article1 = new Articles();
        article1.setId(3L);
        Articles article2 = new Articles();
        article2.setId(50L);

        CommercialMonthlyStockItem item1 = stockItem(37L, article1, 0, 250D, 2_500D);
        CommercialMonthlyStockItem item2 = stockItem(39L, article2, 0, 500D, 500D);
        stock.setItems(Set.of(item1, item2));
        return stock;
    }

    private static CommercialMonthlyStockItem stockItem(
            Long id, Articles article, int remainingQty, double pmp, double soldValue) {
        CommercialMonthlyStockItem item = new CommercialMonthlyStockItem();
        item.setId(id);
        item.setArticle(article);
        item.setQuantityRemaining(remainingQty);
        item.setWeightedAverageUnitPrice(pmp);
        item.setTotalSoldValue(soldValue);
        return item;
    }

    private static Credit credit(Long id, double total, double paid, double remaining) {
        Credit credit = new Credit();
        credit.setId(id);
        credit.setTotalAmount(total);
        credit.setTotalAmountPaid(paid);
        credit.setTotalAmountRemaining(remaining);
        credit.setType(OperationType.CREDIT);
        return credit;
    }

    private static Credit cashCredit(Long id, double total) {
        Credit credit = credit(id, total, total, 0D);
        credit.setType(OperationType.CASH);
        return credit;
    }

    private static CreditSoldAmountOnStockProjection projection(Long creditId, double soldValue) {
        return new CreditSoldAmountOnStockProjection() {
            @Override
            public Long getCreditId() {
                return creditId;
            }

            @Override
            public Double getSoldValue() {
                return soldValue;
            }
        };
    }
}
