package com.optimize.elykia.core.service.accounting;

import com.optimize.elykia.core.entity.accounting.DailyAccounting;
import com.optimize.elykia.core.enumaration.AccountingDayStatus;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.DailyAccountingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
class DailyAccountingServiceEnsureTest {

    @Mock
    private DailyAccountingRepository repository;
    @Mock
    private CreditTimelineRepository creditTimelineRepository;
    @Mock
    private DailyAccountancyService dailyAccountancyService;

    private DailyAccountingService service;

    @BeforeEach
    void setUp() {
        service = new DailyAccountingService(repository, creditTimelineRepository, dailyAccountancyService);
    }

    @Test
    void ensureCurrentRecordForDate_returnsExistingCurrentForSameDate() {
        LocalDate date = LocalDate.of(2026, 7, 17);
        DailyAccounting current = new DailyAccounting();
        current.setId(1L);
        current.setAccountingDate(date);
        current.setStatus(AccountingDayStatus.CURRENT);
        when(repository.findByStatus(AccountingDayStatus.CURRENT)).thenReturn(Optional.of(current));

        DailyAccounting result = service.ensureCurrentRecordForDate(date);

        assertSame(current, result);
        verify(repository, never()).save(any());
    }

    @Test
    void ensureCurrentRecordForDate_closesOrphanAndReactivatesOldRow() {
        LocalDate expected = LocalDate.of(2026, 7, 17);
        LocalDate orphanDate = LocalDate.of(2026, 7, 16);

        DailyAccounting orphan = new DailyAccounting();
        orphan.setId(1L);
        orphan.setAccountingDate(orphanDate);
        orphan.setStatus(AccountingDayStatus.CURRENT);

        DailyAccounting oldForExpected = new DailyAccounting();
        oldForExpected.setId(2L);
        oldForExpected.setAccountingDate(expected);
        oldForExpected.setStatus(AccountingDayStatus.OLD);

        when(repository.findByStatus(AccountingDayStatus.CURRENT)).thenReturn(Optional.of(orphan));
        when(repository.findByAccountingDate(expected)).thenReturn(Optional.of(oldForExpected));
        when(repository.saveAndFlush(any(DailyAccounting.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DailyAccounting result = service.ensureCurrentRecordForDate(expected);

        assertEquals(AccountingDayStatus.OLD, orphan.getStatus());
        assertEquals(AccountingDayStatus.CURRENT, result.getStatus());
        assertEquals(expected, result.getAccountingDate());
    }

    @Test
    void ensureCurrentRecordForDate_createsWhenMissing() {
        LocalDate date = LocalDate.of(2026, 7, 17);
        when(repository.findByStatus(AccountingDayStatus.CURRENT)).thenReturn(Optional.empty());
        when(repository.findByAccountingDate(date)).thenReturn(Optional.empty());
        when(repository.save(any(DailyAccounting.class))).thenAnswer(invocation -> {
            DailyAccounting da = invocation.getArgument(0);
            da.setId(99L);
            return da;
        });

        DailyAccounting result = service.ensureCurrentRecordForDate(date);

        ArgumentCaptor<DailyAccounting> captor = ArgumentCaptor.forClass(DailyAccounting.class);
        verify(repository).save(captor.capture());
        assertEquals(date, captor.getValue().getAccountingDate());
        assertEquals(AccountingDayStatus.CURRENT, captor.getValue().getStatus());
        assertEquals(99L, result.getId());
    }
}
