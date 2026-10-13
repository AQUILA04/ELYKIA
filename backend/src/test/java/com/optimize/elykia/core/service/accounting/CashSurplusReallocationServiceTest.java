package com.optimize.elykia.core.service.accounting;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.report.SurplusReallocationDto;
import com.optimize.elykia.core.entity.report.CashDeposit;
import com.optimize.elykia.core.entity.report.CashSurplusReallocation;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CashDepositRepository;
import com.optimize.elykia.core.repository.CashPeriodRemittanceRepository;
import com.optimize.elykia.core.repository.CashSurplusReallocationRepository;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.service.report.DailyCommercialReportPersistence;
import com.optimize.elykia.core.service.report.DailyOperationService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CashSurplusReallocationServiceTest {

    @Mock private CashDepositRepository cashDepositRepository;
    @Mock private DailyCommercialReportRepository dailyReportRepository;
    @Mock private DailyCommercialReportPersistence reportPersistence;
    @Mock private CashSurplusReallocationRepository reallocationRepository;
    @Mock private CashPeriodRemittanceRepository remittanceRepository;
    @Mock private DailyOperationService dailyOperationService;
    @Mock private UserService userService;
    @Mock private User currentUser;

    @InjectMocks
    private CashSurplusReallocationService service;

    @Test
    void reallocate_movesSurplusToCreditGapAndKeepsTotalDeposited() {
        LocalDate start = LocalDate.of(2026, 9, 29);
        LocalDate end = LocalDate.of(2026, 10, 10);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(true);
        when(currentUser.getUsername()).thenReturn("SEC001");

        DailyCommercialReport dayWithSurplus = report(start, 2_950, 2_950, 7_550);
        DailyCommercialReport shortDay = report(LocalDate.of(2026, 10, 3), 7_200, 2_700, 0);
        when(dailyReportRepository.findByCommercialUsernameAndDateBetweenOrderByDateAsc("COM007", start, end))
                .thenReturn(List.of(dayWithSurplus, shortDay));

        CashDeposit deposit = deposit(41L, start, 10_500, 2_950, 7_550, dayWithSurplus);
        when(cashDepositRepository.findSurplusDepositsForPeriod("COM007", start, end))
                .thenReturn(List.of(deposit));
        when(reportPersistence.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(reallocationRepository.save(any())).thenAnswer(inv -> {
            CashSurplusReallocation saved = inv.getArgument(0);
            saved.setId(9L);
            return saved;
        });

        SurplusReallocationDto result = service.reallocate("COM007", start, end);

        assertEquals(4_500.0, result.getTotalReallocated());
        assertEquals(4_500.0, result.getCreditAllocated());
        assertEquals(0.0, result.getTontineAllocated());
        assertEquals(3_050.0, result.getSurplusRemaining());
        assertEquals(4_500.0, result.getRemainingBefore());
        assertEquals(0.0, result.getRemainingAfter());
        assertEquals(7_450.0, deposit.getCreditAmount());
        assertEquals(3_050.0, deposit.getSurplusAmount());
        assertEquals(7_450.0, dayWithSurplus.getTotalCreditAmountDeposited());
        assertEquals(3_050.0, dayWithSurplus.getTotalSurplusAmountDeposited());
        assertEquals(10_500.0, dayWithSurplus.getTotalAmountDeposited());

        ArgumentCaptor<CashSurplusReallocation> captor = ArgumentCaptor.forClass(CashSurplusReallocation.class);
        verify(reallocationRepository).save(captor.capture());
        assertEquals(1, captor.getValue().getLines().size());
        verify(dailyOperationService).logOperationInCurrentTransaction(
                eq("COM007"),
                eq(OperationType.SURPLUS_REALLOCATION),
                eq(4_500.0),
                contains("COM007"),
                contains("Réaffecté: 4500"),
                eq(0.0),
                eq(0.0),
                any(LocalDate.class));
    }

    @Test
    void reallocate_rejectsWhenNoSurplus() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(true);
        LocalDate day = LocalDate.of(2026, 10, 1);
        DailyCommercialReport report = report(day, 2_500, 2_500, 0);
        when(dailyReportRepository.findByCommercialUsernameAndDateBetweenOrderByDateAsc("COM007", day, day))
                .thenReturn(List.of(report));

        assertThrows(RuntimeException.class, () -> service.reallocate("COM007", day, day));
    }

    private static DailyCommercialReport report(LocalDate date, double toDeposit, double creditDeposited,
            double surplus) {
        DailyCommercialReport report = new DailyCommercialReport();
        report.setId(date.toEpochDay());
        report.setDate(date);
        report.setCommercialUsername("COM007");
        report.setCollectionsAmount(toDeposit);
        report.setTotalAmountToDeposit(toDeposit);
        report.setTotalAmountDeposited(creditDeposited + surplus);
        report.setTotalCreditAmountDeposited(creditDeposited);
        report.setTotalSurplusAmountDeposited(surplus);
        return report;
    }

    private static CashDeposit deposit(Long id, LocalDate date, double amount, double credit, double surplus,
            DailyCommercialReport report) {
        CashDeposit deposit = new CashDeposit();
        deposit.setId(id);
        deposit.setDate(date);
        deposit.setCommercialUsername("COM007");
        deposit.setAmount(amount);
        deposit.setCreditAmount(credit);
        deposit.setTontineAmount(0.0);
        deposit.setNewBalanceAmount(0.0);
        deposit.setSurplusAmount(surplus);
        deposit.setReference("DEP-" + id);
        deposit.setDailyReport(report);
        return deposit;
    }
}
