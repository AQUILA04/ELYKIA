package com.optimize.elykia.core.service.accounting;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.dto.report.CatchupAllocationPreviewDto;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.service.accounting.CashDepositCatchupAllocator.CatchupCap;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CashDepositCatchupServiceTest {

    @Mock private TontineCollectionRepository tontineCollectionRepository;
    @Mock private DailyCommercialReportRepository dailyReportRepository;

    @Test
    void caps_groupsByCollectionDateAndStopsAtTheOpenTontine() {
        LocalDate capture = LocalDate.of(2026, 10, 22);
        LocalDate older = LocalDate.of(2026, 10, 20);
        DailyCommercialReport past = new DailyCommercialReport();
        past.setTontineCollectionsAmount(1_000.0);
        past.setTotalTontineAmountDeposited(700.0);
        past.setSurplusCoverageTontine(100.0);
        List<Object[]> rows = new ArrayList<>();
        rows.add(new Object[] { older.atTime(8, 0), 250.0 });
        rows.add(new Object[] { older.atTime(9, 0), 250.0 });
        when(tontineCollectionRepository.findCatchupRowsByCommercialAndCreatedDate(
                eq("commercial.a"), eq(State.ENABLED), any(), any()))
                .thenReturn(rows);
        when(dailyReportRepository.findByDateAndCommercialUsername(older, "commercial.a"))
                .thenReturn(Optional.of(past));

        List<CatchupCap> caps = service().caps("commercial.a", capture);

        assertEquals(1, caps.size());
        assertEquals(older, caps.get(0).collectionDate());
        assertEquals(500.0, caps.get(0).capturedAmount());
        assertEquals(200.0, caps.get(0).openRemaining());
        assertEquals(200.0, caps.get(0).cap());
    }

    @Test
    void caps_targetsTheDayCatchupAndIgnoresAnOlderUnpaidRemainder() {
        LocalDate capture = LocalDate.of(2026, 10, 22);
        LocalDate older = LocalDate.of(2026, 10, 20);
        DailyCommercialReport past = new DailyCommercialReport();
        past.setTontineCollectionsAmount(10_000.0);
        past.setTotalTontineAmountDeposited(0.0);
        List<Object[]> rows = new ArrayList<>();
        rows.add(new Object[] { older.atTime(11, 0), 2_000.0 });
        when(tontineCollectionRepository.findCatchupRowsByCommercialAndCreatedDate(
                eq("commercial.a"), eq(State.ENABLED), any(), any()))
                .thenReturn(rows);
        when(dailyReportRepository.findByDateAndCommercialUsername(older, "commercial.a"))
                .thenReturn(Optional.of(past));

        List<CatchupCap> caps = service().caps("commercial.a", capture);

        assertEquals(1, caps.size());
        assertEquals(2_000.0, caps.get(0).capturedAmount());
        assertEquals(10_000.0, caps.get(0).openRemaining());
        assertEquals(2_000.0, caps.get(0).cap());
    }

    @Test
    void caps_dropsADateAlreadyFullyDeposited() {
        LocalDate capture = LocalDate.of(2026, 10, 22);
        LocalDate older = LocalDate.of(2026, 10, 18);
        DailyCommercialReport past = new DailyCommercialReport();
        past.setTontineCollectionsAmount(300.0);
        past.setTotalTontineAmountDeposited(300.0);
        List<Object[]> rows = new ArrayList<>();
        rows.add(new Object[] { LocalDateTime.of(2026, 10, 18, 10, 0), 300.0 });
        when(tontineCollectionRepository.findCatchupRowsByCommercialAndCreatedDate(
                eq("commercial.a"), eq(State.ENABLED), any(), any()))
                .thenReturn(rows);
        when(dailyReportRepository.findByDateAndCommercialUsername(older, "commercial.a"))
                .thenReturn(Optional.of(past));

        assertTrue(service().caps("commercial.a", capture).isEmpty());
    }

    @Test
    void preview_addsCatchupCapsToTheDayRemaining() {
        LocalDate capture = LocalDate.of(2026, 10, 22);
        DailyCommercialReport today = new DailyCommercialReport();
        today.setCollectionsAmount(100.0);
        today.setTontineCollectionsAmount(50.0);
        today.setNewAccountsBalance(25.0);
        when(dailyReportRepository.findByDateAndCommercialUsername(capture, "commercial.a"))
                .thenReturn(Optional.of(today));
        when(tontineCollectionRepository.findCatchupRowsByCommercialAndCreatedDate(
                eq("commercial.a"), eq(State.ENABLED), any(), any()))
                .thenReturn(new ArrayList<>());

        CatchupAllocationPreviewDto preview = service().preview("commercial.a", capture);

        assertEquals(100.0, preview.getRemainingCredit());
        assertEquals(50.0, preview.getRemainingTontine());
        assertEquals(25.0, preview.getRemainingNewBalance());
        assertEquals(175.0, preview.getTotalRemaining());
        assertTrue(preview.getSlices().isEmpty());
    }

    private CashDepositCatchupService service() {
        return new CashDepositCatchupService(tontineCollectionRepository, dailyReportRepository);
    }
}
