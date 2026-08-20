package com.optimize.elykia.core.service.report;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.dto.AccountingReportDto;
import com.optimize.elykia.core.dto.DownloadData;
import com.optimize.elykia.core.dto.ItemReleaseSheetDto;
import com.optimize.elykia.core.entity.accounting.DailyAccountancy;
import com.optimize.elykia.core.enumaration.PeriodState;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.DailyAccountingRepository;
import com.optimize.elykia.core.repository.view.AccountancyReportRepository;
import com.optimize.elykia.core.service.accounting.AccountingDayService;
import com.optimize.elykia.core.service.accounting.DailyAccountancyService;
import com.optimize.common.entities.util.DateUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private AccountancyReportRepository accountancyReportRepository;
    @Mock
    private DailyAccountingRepository dailyAccountingRepository;
    @Mock
    private DailyAccountancyService dailyAccountancyService;
    @Mock
    private CreditRepository creditRepository;
    @Mock
    private AccountingDayService accountingDayService;
    @InjectMocks
    private ReportService service;

    @Test
    void getTotalCollectedAmountByPeriod_combinesAccountingAndReleasedCreditAmounts() {
        // Given
        when(dailyAccountingRepository.sumByPeriod(any(), any())).thenReturn(125_000.0);
        when(creditRepository.sumByBeginDateGreaterThanEqualAndBeginDateLessThanEqual(any(), any(), any()))
                .thenReturn(300_000.0);

        // When
        AccountingReportDto result = service.getTotalCollectedAmountByPeriod(PeriodState.CE_MOIS);

        // Then
        assertEquals(125_000.0, result.getTotalAmount());
        assertEquals(300_000.0, result.getReleasedTotalAmount());
        verify(dailyAccountingRepository).sumByPeriod(result.getDateFrom(), result.getDateTo());
        verify(creditRepository).sumByBeginDateGreaterThanEqualAndBeginDateLessThanEqual(
                result.getDateFrom(), result.getDateTo(), List.of("INPROGRESS", "SETTLED", "ENDED"));
    }

    @Test
    void getItemReleaseSheetByCollector_usesExplicitDateAndAllCollectorsQuery() {
        // Given
        LocalDate releaseDate = LocalDate.of(2026, 8, 15);
        DownloadData first = org.mockito.Mockito.mock(DownloadData.class);
        DownloadData second = org.mockito.Mockito.mock(DownloadData.class);
        when(first.getTotalPrice()).thenReturn(120.0);
        when(second.getTotalPrice()).thenReturn(80.0);
        when(creditRepository.getReleaseDownloadData(releaseDate, ClientType.PROMOTER))
                .thenReturn(List.of(first, second));

        // When
        ItemReleaseSheetDto result = service.getItemReleaseSheetByCollector("TOUT", releaseDate);

        // Then
        assertEquals("TOUT", result.getCollector());
        assertEquals(DateUtils.simpleDateFormat(releaseDate), result.getDate());
        assertEquals(List.of(first, second), result.getArticles());
        assertEquals(200.0, result.getTotalPrice());
        verify(creditRepository).getReleaseDownloadData(releaseDate, ClientType.PROMOTER);
    }

    @Test
    void getItemReleaseSheetByCollector_usesOpenAccountingDateForSpecificCollector() {
        // Given
        LocalDate accountingDate = LocalDate.of(2026, 8, 16);
        DownloadData item = org.mockito.Mockito.mock(DownloadData.class);
        when(item.getTotalPrice()).thenReturn(75.0);
        when(accountingDayService.getOpenAccountingDate()).thenReturn(accountingDate);
        when(creditRepository.getDownloadDataByCollector(accountingDate, "collector.a", ClientType.PROMOTER))
                .thenReturn(List.of(item));

        // When
        ItemReleaseSheetDto result = service.getItemReleaseSheetByCollector("collector.a", null);

        // Then
        assertEquals(DateUtils.simpleDateFormat(accountingDate), result.getDate());
        assertEquals(75.0, result.getTotalPrice());
        verify(creditRepository).getDownloadDataByCollector(accountingDate, "collector.a", ClientType.PROMOTER);
    }

    @Test
    void getOperationsByCollectorAndPeriod_delegatesToDailyAccountancyService() {
        // Given
        DailyAccountancy operation = new DailyAccountancy();
        List<DailyAccountancy> expected = List.of(operation);
        when(dailyAccountancyService.getCollectorAccountancyByPeriod(PeriodState.CE_JOUR, "collector.a"))
                .thenReturn(expected);

        // When
        List<DailyAccountancy> result = service.getOperationsByCollectorAndPeriod(PeriodState.CE_JOUR, "collector.a");

        // Then
        assertSame(expected, result);
        verify(dailyAccountancyService).getCollectorAccountancyByPeriod(PeriodState.CE_JOUR, "collector.a");
    }
}
