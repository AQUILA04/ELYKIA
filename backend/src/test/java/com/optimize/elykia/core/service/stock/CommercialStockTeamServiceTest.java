package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.dto.stock.StockRecoverySummaryDto;
import com.optimize.elykia.core.dto.stock.team.StockTeamLineDto;
import com.optimize.elykia.core.dto.stock.team.StockTeamOverviewDto;
import com.optimize.elykia.core.dto.stock.team.StockToSettleDto;
import com.optimize.elykia.core.entity.debt.DebtDocument;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.enumaration.DebtStatus;
import com.optimize.elykia.core.enumaration.DebtType;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.DebtDocumentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialStockTeamServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 20);

    @Mock private CommercialMonthlyStockRepository stockRepository;
    @Mock private DebtDocumentRepository debtRepository;
    @Mock private CommercialMonthlyStockRecoveryService recoveryService;
    @InjectMocks private CommercialStockTeamService service;

    @Test
    void overview_buildsOneLinePerCommercialSortedByAmountLeftToRecover() {
        CommercialMonthlyStock com012 = stock(1L, "COM012", 11, item(65, 65, 0, 0, 450D), item(1, 0, 0, 1, 2_200D));
        CommercialMonthlyStock com006 = stock(2L, "COM006", 11, item(10, 8, 0, 2, 1_000D));
        when(stockRepository.findWithItemsByMonthAndYear(11, 2026)).thenReturn(List.of(com006, com012));
        when(debtRepository.findByMonthlyStockIdInAndDebtTypeAndStatusNot(any(), eq(DebtType.MERCHANDISE),
                eq(DebtStatus.CANCELLED))).thenReturn(List.of());
        when(recoveryService.aggregate(com012)).thenReturn(summary(356_125D, 2_200D, 0D, 100_325D));
        when(recoveryService.aggregate(com006)).thenReturn(summary(10_000D, 2_000D, 0D, 9_000D));

        StockTeamOverviewDto overview = service.overview(2026, 11, null, TODAY);

        assertFalse(overview.closed());
        assertEquals(List.of("COM012", "COM006"), overview.lines().stream().map(StockTeamLineDto::collector).toList());
        StockTeamLineDto line = overview.lines().get(0);
        assertEquals(2, line.itemsCount());
        assertEquals(1, line.itemsWithRemaining());
        assertEquals(66L, line.quantityTaken());
        assertEquals(65L, line.quantitySold());
        assertEquals(1L, line.quantityRemaining());
        assertEquals(356_125D, line.dueValue());
        assertEquals(353_925D, line.soldValue());
        assertEquals(100_325D, line.recoveredValue());
        assertEquals(255_800D, line.leftToRecover());
        assertEquals(29D, line.recoveryRate());
        assertFalse(line.toSettle(), "mois en cours : rien à régulariser");
        assertEquals(2, overview.totals().commercialsCount());
        assertEquals(366_125D, overview.totals().dueValue());
        assertEquals(256_800D, overview.totals().leftToRecover());
    }

    @Test
    void overview_countsTheSettledDebtAsRecoveredAndFlagsUnsettledClosedMonths() {
        CommercialMonthlyStock withDebt = stock(1L, "COM006", 10, item(10, 8, 0, 0, 1_000D));
        withDebt.getItems().iterator().next().setQuantityDebt(2);
        CommercialMonthlyStock withoutDebt = stock(2L, "COM009", 10, item(5, 4, 0, 1, 500D));
        when(stockRepository.findWithItemsByMonthAndYear(10, 2026)).thenReturn(List.of(withDebt, withoutDebt));
        DebtDocument debt = new DebtDocument();
        debt.setId(70L);
        debt.setMonthlyStock(withDebt);
        debt.setStatus(DebtStatus.PARTIALLY_SETTLED);
        debt.setPaidAmount(1_000D);
        debt.setOffsetAmount(0D);
        debt.setRemainingAmount(1_000D);
        when(debtRepository.findByMonthlyStockIdInAndDebtTypeAndStatusNot(any(), eq(DebtType.MERCHANDISE),
                eq(DebtStatus.CANCELLED))).thenReturn(List.of(debt));
        when(recoveryService.aggregate(withDebt)).thenReturn(summary(10_000D, 0D, 2_000D, 8_000D));
        when(recoveryService.aggregate(withoutDebt)).thenReturn(summary(2_500D, 500D, 0D, 2_000D));

        StockTeamOverviewDto overview = service.overview(2026, 10, null, TODAY);

        assertTrue(overview.closed());
        StockTeamLineDto debtLine = overview.lines().stream().filter(l -> l.collector().equals("COM006")).findFirst().orElseThrow();
        assertEquals(70L, debtLine.merchandiseDebtId());
        assertEquals("PARTIALLY_SETTLED", debtLine.debtStatus());
        assertEquals(9_000D, debtLine.recoveredValue(), "ventes recouvrées + dette réglée");
        assertEquals(1_000D, debtLine.debtRemaining());
        assertFalse(debtLine.toSettle());
        StockTeamLineDto other = overview.lines().stream().filter(l -> l.collector().equals("COM009")).findFirst().orElseThrow();
        assertNull(other.merchandiseDebtId());
        assertTrue(other.toSettle(), "mois passé, reste sans dette");
    }

    @Test
    void overview_isolatesOneCommercialWithoutQueryingDebtsWhenNothingMatches() {
        when(stockRepository.findWithItemsByMonthAndYear(11, 2026))
                .thenReturn(List.of(stock(2L, "COM006", 11, item(1, 1, 0, 0, 100D))));

        StockTeamOverviewDto overview = service.overview(2026, 11, "COM012", TODAY);

        assertTrue(overview.lines().isEmpty());
        assertEquals(0, overview.totals().commercialsCount());
        verify(debtRepository, never()).findByMonthlyStockIdInAndDebtTypeAndStatusNot(any(), any(), any());
    }

    @Test
    void toSettle_valuesTheRemainderLikeTheMerchandiseDebtAndSortsOldestFirst() {
        CommercialMonthlyStock october = stock(1L, "COM006", 10, item(10, 7, 0, 3, 1_000.4D), item(2, 2, 0, 0, 500D));
        CommercialMonthlyStock september = stock(2L, "COM009", 9, item(4, 3, 0, 1, 2_500D));
        when(stockRepository.findClosedWithRemainingAndNoDebt(11, 2026)).thenReturn(List.of(october, september));

        List<StockToSettleDto> toSettle = service.toSettle(null, TODAY);

        assertEquals(List.of(9, 10), toSettle.stream().map(StockToSettleDto::month).toList());
        StockToSettleDto oct = toSettle.get(1);
        assertEquals(1, oct.itemsWithRemaining());
        assertEquals(3L, oct.quantityRemaining());
        assertEquals(3_003D, oct.remainingValue(), "3 × ceil(1 000,4) comme la dette marchandise");
    }

    private static CommercialMonthlyStock stock(Long id, String collector, int month, CommercialMonthlyStockItem... items) {
        CommercialMonthlyStock stock = new CommercialMonthlyStock();
        stock.setId(id);
        stock.setCollector(collector);
        stock.setMonth(month);
        stock.setYear(2026);
        stock.setItems(Set.of(items));
        return stock;
    }

    private static CommercialMonthlyStockItem item(int taken, int sold, int returned, int remaining, double unitPrice) {
        CommercialMonthlyStockItem item = new CommercialMonthlyStockItem();
        item.setQuantityTaken(taken);
        item.setQuantitySold(sold);
        item.setQuantityReturned(returned);
        item.setQuantityRemaining(remaining);
        item.setWeightedAverageUnitPrice(unitPrice);
        return item;
    }

    private static StockRecoverySummaryDto summary(double due, double physical, double debt, double recovered) {
        return StockRecoverySummaryDto.builder()
                .totalDueAmount(due)
                .remainingFromPhysicalStock(physical)
                .debtValueAmount(debt)
                .recoveredFromSales(recovered)
                .build();
    }
}
