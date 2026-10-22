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
import com.optimize.elykia.core.repository.DebtDocumentRepository;
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
    @Mock private DebtDocumentRepository debtDocumentRepository;
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
        when(dailyReportRepository.findByCommercialUsernameIgnoreCaseAndDateLessThanEqualOrderByDateAsc("COM007", end))
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
        assertEquals(2_950.0, dayWithSurplus.getTotalCreditAmountDeposited());
        assertEquals(3_050.0, dayWithSurplus.getTotalSurplusAmountDeposited());
        assertEquals(10_500.0, dayWithSurplus.getTotalAmountDeposited());
        assertEquals(4_500.0, shortDay.getSurplusCoverageCredit());
        assertEquals(2_700.0, shortDay.getTotalCreditAmountDeposited());
        assertEquals(2_700.0, shortDay.getTotalAmountDeposited());

        ArgumentCaptor<CashSurplusReallocation> captor = ArgumentCaptor.forClass(CashSurplusReallocation.class);
        verify(reallocationRepository).save(captor.capture());
        assertEquals(1, captor.getValue().getLines().size());
        assertEquals(shortDay.getDate(), captor.getValue().getLines().get(0).getTargetDate());
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
        when(dailyReportRepository.findByCommercialUsernameIgnoreCaseAndDateLessThanEqualOrderByDateAsc("COM007", day))
                .thenReturn(List.of(report));

        assertThrows(RuntimeException.class, () -> service.reallocate("COM007", day, day));
    }

    @Test
    void reallocate_usesTodaySurplusForAnOlderGapOutsideTheFilter() {
        LocalDate past = LocalDate.of(2026, 10, 5);
        LocalDate today = LocalDate.of(2026, 10, 22);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(true);
        when(currentUser.getUsername()).thenReturn("ADM001");

        DailyCommercialReport pastDay = tontineReport(past, 40_000);
        DailyCommercialReport todayReport = report(today, 0, 0, 27_100);
        when(dailyReportRepository.findByCommercialUsernameIgnoreCaseAndDateLessThanEqualOrderByDateAsc("COM007", today))
                .thenReturn(List.of(pastDay, todayReport));
        CashDeposit deposit = deposit(7L, today, 27_100, 0, 27_100, todayReport);
        when(cashDepositRepository.findSurplusDepositsForPeriod("COM007", today, today))
                .thenReturn(List.of(deposit));
        when(reportPersistence.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(reallocationRepository.save(any())).thenAnswer(inv -> {
            CashSurplusReallocation saved = inv.getArgument(0);
            saved.setId(3L);
            return saved;
        });

        SurplusReallocationDto result = service.reallocate("COM007", today, today);

        assertEquals(27_100.0, result.getTotalReallocated());
        assertEquals(27_100.0, result.getTontineAllocated());
        assertEquals(0.0, result.getSurplusRemaining());
        assertEquals(12_900.0, result.getRemainingAfter());
        assertEquals(0.0, todayReport.getTotalSurplusAmountDeposited());
        assertEquals(27_100.0, todayReport.getTotalAmountDeposited());
        assertEquals(0.0, todayReport.getTotalTontineAmountDeposited() == null ? 0.0 : todayReport.getTotalTontineAmountDeposited());
        assertEquals(27_100.0, pastDay.getSurplusCoverageTontine());
        assertEquals(0.0, pastDay.getTotalAmountDeposited());
        assertEquals(past, result.getLines().get(0).getTargetDate());
    }

    @Test
    void reallocate_skipsDayAlreadyConstitutedAsCashDebt() {
        LocalDate older = LocalDate.of(2026, 9, 1);
        LocalDate locked = LocalDate.of(2026, 10, 1);
        LocalDate today = LocalDate.of(2026, 10, 22);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(currentUser.is(UserProfilConstant.SECRETARY)).thenReturn(false);
        when(currentUser.is(UserProfilConstant.ADMIN)).thenReturn(true);
        when(currentUser.getUsername()).thenReturn("ADM001");
        when(debtDocumentRepository.findActiveCashDaysUpTo("COM007", today)).thenReturn(List.of(locked));

        DailyCommercialReport olderDay = report(older, 500, 0, 0);
        DailyCommercialReport lockedDay = report(locked, 1_000, 0, 0);
        DailyCommercialReport todayReport = report(today, 0, 0, 1_000);
        when(dailyReportRepository.findByCommercialUsernameIgnoreCaseAndDateLessThanEqualOrderByDateAsc("COM007", today))
                .thenReturn(List.of(olderDay, lockedDay, todayReport));
        CashDeposit deposit = deposit(8L, today, 1_000, 0, 1_000, todayReport);
        when(cashDepositRepository.findSurplusDepositsForPeriod("COM007", today, today))
                .thenReturn(List.of(deposit));
        when(reportPersistence.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(reallocationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SurplusReallocationDto result = service.reallocate("COM007", today, today);

        assertEquals(500.0, result.getTotalReallocated());
        assertEquals(500.0, result.getCreditAllocated());
        assertEquals(500.0, result.getRemainingBefore());
        assertEquals(0.0, result.getRemainingAfter());
        assertEquals(500.0, olderDay.getSurplusCoverageCredit());
        assertEquals(0.0, lockedDay.getSurplusCoverageCredit() == null ? 0.0 : lockedDay.getSurplusCoverageCredit());
        assertEquals(older, result.getLines().get(0).getTargetDate());
    }

    private static DailyCommercialReport tontineReport(LocalDate date, double tontineToDeposit) {
        DailyCommercialReport report = new DailyCommercialReport();
        report.setId(date.toEpochDay());
        report.setDate(date);
        report.setCommercialUsername("COM007");
        report.setTontineCollectionsAmount(tontineToDeposit);
        report.setTotalAmountToDeposit(tontineToDeposit);
        report.setTotalAmountDeposited(0.0);
        report.setTotalTontineAmountDeposited(0.0);
        report.setTotalSurplusAmountDeposited(0.0);
        return report;
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
