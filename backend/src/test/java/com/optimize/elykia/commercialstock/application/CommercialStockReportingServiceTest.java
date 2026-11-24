package com.optimize.elykia.commercialstock.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.commercialstock.api.CommercialStockMovementType;
import com.optimize.elykia.commercialstock.api.CommercialStockPeriodRowView;
import com.optimize.elykia.commercialstock.api.CommercialStockTeamRowView;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import com.optimize.elykia.commercialstock.domain.CommercialStockLedgerEntry;
import com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockLedgerEntryRepository;
import com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockPeriodSnapshotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CommercialStockReportingServiceTest {

    private CommercialStockLedgerEntryRepository ledgerRepository;
    private CommercialStockPeriodSnapshotRepository snapshotRepository;
    private CommercialStockReportingService service;

    @BeforeEach
    void setUp() {
        ledgerRepository = mock(CommercialStockLedgerEntryRepository.class);
        snapshotRepository = mock(CommercialStockPeriodSnapshotRepository.class);
        service = new CommercialStockReportingService(ledgerRepository, snapshotRepository);
    }

    private CommercialStockLedgerEntry entry(CommercialStockMovementType type, int delta, LocalDate date,
                                             Double purchaseValue, Double saleValue, boolean backdated) {
        CommercialStockLedgerEntry entry = new CommercialStockLedgerEntry();
        entry.setCollector("com.a");
        entry.setArticleId(7L);
        entry.setActivityType(StockActivityType.CREDIT);
        entry.setMovementType(type);
        entry.setDeltaQuantity(delta);
        entry.setAccountingDate(date);
        entry.setTotalPurchaseValue(purchaseValue);
        entry.setTotalSaleValue(saleValue);
        entry.setBackdated(backdated);
        return entry;
    }

    @Test
    void periodReport_satisfiesConservationEquationWithBackdatedAndCancellation() {
        LocalDate start = LocalDate.of(2026, 2, 1);
        LocalDate end = LocalDate.of(2026, 2, 28);
        when(ledgerRepository.findAllUpTo(null, null, end)).thenReturn(List.of(
                entry(CommercialStockMovementType.STOCK_IN, 5, LocalDate.of(2026, 1, 10), null, null, false),
                entry(CommercialStockMovementType.CREDIT_SALE, -2, LocalDate.of(2026, 1, 20), 8000.0, 10000.0, false),
                entry(CommercialStockMovementType.STOCK_IN, 6, LocalDate.of(2026, 2, 3), null, null, false),
                entry(CommercialStockMovementType.CREDIT_SALE, -4, LocalDate.of(2026, 2, 10), 16000.0, 20000.0, true),
                entry(CommercialStockMovementType.SALE_CANCELLATION, 1, LocalDate.of(2026, 2, 11), 4000.0, 5000.0, false),
                entry(CommercialStockMovementType.RETURN, -1, LocalDate.of(2026, 2, 12), null, null, false),
                entry(CommercialStockMovementType.ACTIVITY_TRANSFER_OUT, -1, LocalDate.of(2026, 2, 14), null, null, false),
                entry(CommercialStockMovementType.DEBT_WRITE_OFF, -1, LocalDate.of(2026, 2, 20), null, null, false)));

        List<CommercialStockPeriodRowView> rows = service.periodReport(start, end, null, null);

        assertEquals(1, rows.size());
        CommercialStockPeriodRowView row = rows.get(0);
        assertEquals(3, row.openingQuantity());
        assertEquals(6, row.inQuantity());
        assertEquals(3, row.soldQuantity());
        assertEquals(1, row.returnedQuantity());
        assertEquals(-1, row.transferNetQuantity());
        assertEquals(1, row.debtQuantity());
        assertEquals(3, row.closingQuantity());
        assertEquals(15000.0, row.soldValue(), 0.001);
        assertEquals(12000.0, row.purchaseCostOfSold(), 0.001);
        assertEquals(3000.0, row.realizedMargin(), 0.001);
        assertTrue(row.hasBackdatedMovements());
    }

    @Test
    void teamOverview_aggregatesPerCollectorAndActivity() {
        LocalDate start = LocalDate.of(2026, 2, 1);
        LocalDate end = LocalDate.of(2026, 2, 28);
        when(ledgerRepository.findAllUpTo(null, null, end)).thenReturn(List.of(
                entry(CommercialStockMovementType.STOCK_IN, 5, LocalDate.of(2026, 2, 1), null, null, false),
                entry(CommercialStockMovementType.CREDIT_SALE, -2, LocalDate.of(2026, 2, 5), 8000.0, 10000.0, false)));

        List<CommercialStockTeamRowView> team = service.teamOverview(start, end, null, null);

        assertEquals(1, team.size());
        assertEquals(3, team.get(0).closingQuantity());
        assertEquals(2000.0, team.get(0).realizedMargin(), 0.001);
    }

    @Test
    void computeMonthlySnapshots_persistsSnapshotsAndMarksRestatedOnSecondRun() {
        when(ledgerRepository.findAllUpTo(any(), any(), any())).thenReturn(List.of(
                entry(CommercialStockMovementType.STOCK_IN, 4, LocalDate.of(2026, 2, 2), null, null, false)));
        when(snapshotRepository
                .findByCollectorAndArticleIdAndActivityTypeAndPeriodGrainAndPeriodYearAndPeriodMonth(
                        any(), any(), any(), any(), any(), any())).thenReturn(Optional.empty());

        assertEquals(1, service.computeMonthlySnapshots(2026, 2));
        verify(snapshotRepository).save(any());
    }

    @Test
    void periodReport_rejectsInvertedWindow() {
        assertThrows(CustomValidationException.class,
                () -> service.periodReport(LocalDate.of(2026, 3, 1), LocalDate.of(2026, 2, 1), null, null));
    }
}
