package com.optimize.elykia.core.service.accounting;

import com.optimize.elykia.core.entity.accounting.DailyAccounting;
import com.optimize.elykia.core.enumaration.AccountingDayStatus;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.DailyAccountingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DailyAccountingServiceTest {

    @Mock private DailyAccountingRepository dailyAccountingRepository;
    @Mock private CreditTimelineRepository creditTimelineRepository;
    @Mock private DailyAccountancyService dailyAccountancyService;

    @Test
    void ensureCurrentRecordForDate_returnsExistingCurrentRecordForTheSameDateWithoutMutation() {
        // Given
        DailyAccountingService service = service();
        LocalDate date = LocalDate.of(2026, 8, 19);
        DailyAccounting current = dailyAccounting(date, AccountingDayStatus.CURRENT);
        when(dailyAccountingRepository.findByStatus(AccountingDayStatus.CURRENT)).thenReturn(Optional.of(current));

        // When
        DailyAccounting returned = service.ensureCurrentRecordForDate(date);

        // Then
        assertSame(current, returned);
        assertEquals(AccountingDayStatus.CURRENT, current.getStatus());
        verify(dailyAccountingRepository, never()).findByAccountingDate(any());
        verify(dailyAccountingRepository, never()).saveAndFlush(any());
    }

    @Test
    void ensureCurrentRecordForDate_closesOrphanCurrentAndReactivatesExistingRecordForRequestedDate() {
        // Given
        DailyAccountingService service = service();
        LocalDate previousDate = LocalDate.of(2026, 8, 18);
        LocalDate requestedDate = LocalDate.of(2026, 8, 19);
        DailyAccounting orphanCurrent = dailyAccounting(previousDate, AccountingDayStatus.CURRENT);
        DailyAccounting reusable = dailyAccounting(requestedDate, AccountingDayStatus.OLD);
        when(dailyAccountingRepository.findByStatus(AccountingDayStatus.CURRENT)).thenReturn(Optional.of(orphanCurrent));
        when(dailyAccountingRepository.findByAccountingDate(requestedDate)).thenReturn(Optional.of(reusable));
        when(dailyAccountingRepository.saveAndFlush(any(DailyAccounting.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        DailyAccounting returned = service.ensureCurrentRecordForDate(requestedDate);

        // Then
        assertSame(reusable, returned);
        assertEquals(AccountingDayStatus.OLD, orphanCurrent.getStatus());
        assertEquals(AccountingDayStatus.CURRENT, reusable.getStatus());
        verify(dailyAccountingRepository).saveAndFlush(orphanCurrent);
        verify(dailyAccountingRepository).saveAndFlush(reusable);
    }

    @Test
    void closeDailyAccounting_usesCurrentFallbackWhenRequestedDateHasNoRecordAndClosesItWithTimelineAmount() {
        // Given
        DailyAccountingService service = service();
        LocalDate requestedDate = LocalDate.of(2026, 8, 19);
        DailyAccounting current = dailyAccounting(LocalDate.of(2026, 8, 18), AccountingDayStatus.CURRENT);
        when(dailyAccountingRepository.findByAccountingDate(requestedDate)).thenReturn(Optional.empty());
        when(dailyAccountingRepository.findByStatus(AccountingDayStatus.CURRENT)).thenReturn(Optional.of(current));
        when(creditTimelineRepository.sumAmountByDate(requestedDate.atStartOfDay(), requestedDate.atTime(23, 59, 59)))
                .thenReturn(45_500.0);
        when(dailyAccountingRepository.saveAndFlush(current)).thenReturn(current);

        // When
        DailyAccounting closed = service.closeDailyAccounting(requestedDate);

        // Then
        assertSame(current, closed);
        assertEquals(AccountingDayStatus.OLD, closed.getStatus());
        assertEquals(45_500.0, closed.getTotalAmount());
        verify(dailyAccountingRepository).saveAndFlush(current);
    }

    private DailyAccountingService service() {
        return new DailyAccountingService(dailyAccountingRepository, creditTimelineRepository, dailyAccountancyService);
    }

    private DailyAccounting dailyAccounting(LocalDate date, AccountingDayStatus status) {
        DailyAccounting accounting = new DailyAccounting();
        accounting.setAccountingDate(date);
        accounting.setStatus(status);
        return accounting;
    }
}
