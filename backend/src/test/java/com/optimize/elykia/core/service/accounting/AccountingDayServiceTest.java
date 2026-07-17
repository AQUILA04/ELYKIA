package com.optimize.elykia.core.service.accounting;

import com.optimize.elykia.core.entity.accounting.AccountingDay;
import com.optimize.elykia.core.enumaration.AccountingDayStatus;
import com.optimize.elykia.core.repository.AccountingDayRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountingDayServiceTest {

    @Mock
    private AccountingDayRepository repository;
    @Mock
    private DailyAccountingService dailyAccountingService;
    @Mock
    private AccountingDayStepExecutor accountingDayStepExecutor;

    private AccountingDayService service;

    @BeforeEach
    void setUp() {
        service = new AccountingDayService(repository, dailyAccountingService, accountingDayStepExecutor);
    }

    @Test
    void hasOpenedDay_returnsFalseWhenNoOpenedDay() {
        when(repository.findByStatus(AccountingDayStatus.OPENED)).thenReturn(Optional.empty());

        Map<String, Object> result = service.hasOpenedDay();

        assertFalse((Boolean) result.get("status"));
        assertFalse(result.containsKey("accountingDate"));
    }

    @Test
    void hasOpenedDay_returnsTrueWithDateWhenOpened() {
        AccountingDay day = new AccountingDay();
        day.setAccountingDate(LocalDate.of(2026, 7, 17));
        when(repository.findByStatus(AccountingDayStatus.OPENED)).thenReturn(Optional.of(day));

        Map<String, Object> result = service.hasOpenedDay();

        assertTrue((Boolean) result.get("status"));
        assertEquals(LocalDate.of(2026, 7, 17), result.get("accountingDate"));
        verifyNoInteractions(accountingDayStepExecutor);
    }

    @Test
    void ensureAccountingReadyForOperations_usesFastPathWhenAlreadyReady() {
        LocalDate today = LocalDate.now();
        when(accountingDayStepExecutor.findReadyAccountingDate()).thenReturn(Optional.of(today));

        LocalDate result = service.ensureAccountingReadyForOperations();

        assertEquals(today, result);
        verify(accountingDayStepExecutor, never()).ensureCurrentDailyAccountingRecord(today);
    }

    @Test
    void ensureAccountingReadyForOperations_healsDailyAccountingWhenMissing() {
        LocalDate today = LocalDate.now();
        when(accountingDayStepExecutor.findReadyAccountingDate())
                .thenReturn(Optional.empty())
                .thenReturn(Optional.empty());

        AccountingDay opened = new AccountingDay();
        opened.setId(10L);
        opened.setAccountingDate(today);
        when(accountingDayStepExecutor.findOpenedAccountingDay()).thenReturn(Optional.of(opened));

        LocalDate result = service.ensureAccountingReadyForOperations();

        assertEquals(today, result);
        verify(accountingDayStepExecutor).ensureCurrentDailyAccountingRecord(today);
    }

    @Test
    void openAccountingDay_closesStaleDesksWithBulkUpdateNotPerRowLoop() {
        LocalDate today = LocalDate.now();
        when(accountingDayStepExecutor.findOpenedAccountingDay()).thenReturn(Optional.empty());
        when(accountingDayStepExecutor.existsClosedAccountingDayForDate(today)).thenReturn(false);
        when(accountingDayStepExecutor.closeAllOpenCashDesksBulk()).thenReturn(377646);

        AccountingDay created = new AccountingDay();
        created.setId(1L);
        created.setAccountingDate(today);
        when(accountingDayStepExecutor.createAndOpenAccountingDay(today)).thenReturn(created);

        AccountingDay result = service.openAccountingDay();

        assertEquals(today, result.getAccountingDate());
        verify(accountingDayStepExecutor).closeAllOpenCashDesksBulk();
        verify(accountingDayStepExecutor).closeCurrentDailyAccountingIfPresent();
        verify(accountingDayStepExecutor, never()).findOpenCashDesks();
        verify(accountingDayStepExecutor, never()).closeOpenCashDesk(any(), any());
        verify(accountingDayStepExecutor).createAndOpenAccountingDay(today);
        verify(accountingDayStepExecutor).ensureCurrentDailyAccountingRecord(today);
    }
}
