package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.dto.sale.CollectorTransferDetailDto;
import com.optimize.elykia.core.dto.sale.CollectorTransferPairDto;
import com.optimize.elykia.core.dto.sale.CollectorTransferSummaryDto;
import com.optimize.elykia.core.repository.CreditCollectorHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CollectorTransferReportServiceTest {

    @Mock
    private CreditCollectorHistoryRepository creditCollectorHistoryRepository;

    private CollectorTransferReportService service;

    @BeforeEach
    void setUp() {
        service = new CollectorTransferReportService(creditCollectorHistoryRepository);
    }

    @Test
    void getSummaryAggregatesPairsAndTotals() {
        LocalDateTime first = LocalDateTime.of(2026, 7, 1, 10, 0);
        LocalDateTime last = LocalDateTime.of(2026, 7, 15, 16, 30);
        when(creditCollectorHistoryRepository.aggregateByCollectorPair(
                eq("COM014"), eq("COM013"), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{
                        "COM014", "COM013", 2L, 100_000D, 40_000D, 60_000D,
                        Timestamp.valueOf(first), Timestamp.valueOf(last)
                }));

        CollectorTransferSummaryDto summary = service.getSummary("COM014", "COM013", null, null);

        assertEquals(2L, summary.getCreditCount());
        assertEquals(100_000D, summary.getTotalSalesAmount());
        assertEquals(40_000D, summary.getTotalPaidAtTransfer());
        assertEquals(60_000D, summary.getTotalRemainingAtTransfer());
        assertEquals(1, summary.getByPair().size());

        CollectorTransferPairDto pair = summary.getByPair().get(0);
        assertEquals("COM014", pair.getOldCollector());
        assertEquals("COM013", pair.getNewCollector());
        assertEquals(2L, pair.getCreditCount());
        assertEquals(first, pair.getFirstTransferDate());
        assertEquals(last, pair.getLastTransferDate());
    }

    @Test
    void getDetailsMapsJoinedRowsAndConvertsDateBounds() {
        LocalDate from = LocalDate.of(2026, 7, 1);
        LocalDate to = LocalDate.of(2026, 7, 31);
        LocalDateTime changeDate = LocalDateTime.of(2026, 7, 10, 12, 0);

        when(creditCollectorHistoryRepository.findTransferDetails(
                eq("COM014"), eq("COM013"),
                eq(from.atStartOfDay()),
                eq(to.plusDays(1).atStartOfDay())))
                .thenReturn(List.<Object[]>of(new Object[]{
                        11L, 99L, "CR-99", "INPROGRESS", "Doe John", "0600000000",
                        "COM014", "COM013", 50_000D, 10_000D, 40_000D,
                        15_000D, 35_000D, Timestamp.valueOf(changeDate), "admin"
                }));

        List<CollectorTransferDetailDto> details = service.getDetails("COM014", "COM013", from, to);

        assertEquals(1, details.size());
        CollectorTransferDetailDto detail = details.get(0);
        assertEquals(11L, detail.getHistoryId());
        assertEquals(99L, detail.getCreditId());
        assertEquals("CR-99", detail.getCreditReference());
        assertEquals("INPROGRESS", detail.getCreditStatus());
        assertEquals("Doe John", detail.getClientName());
        assertEquals(40_000D, detail.getTotalAmountRemaining());
        assertEquals(35_000D, detail.getCurrentAmountRemaining());
        assertEquals(changeDate, detail.getChangeDate());
        assertEquals("admin", detail.getOperatedBy());

        verify(creditCollectorHistoryRepository).findTransferDetails(
                eq("COM014"), eq("COM013"),
                eq(from.atStartOfDay()),
                eq(to.plusDays(1).atStartOfDay()));
    }

    @Test
    void blankFiltersBecomeNull() {
        when(creditCollectorHistoryRepository.aggregateByCollectorPair(
                isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of());

        CollectorTransferSummaryDto summary = service.getSummary("  ", "", null, null);

        assertEquals(0L, summary.getCreditCount());
        assertEquals(0, summary.getByPair().size());
    }
}
