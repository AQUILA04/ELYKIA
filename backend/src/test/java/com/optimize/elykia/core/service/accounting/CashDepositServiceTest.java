package com.optimize.elykia.core.service.accounting;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.entity.report.CashDeposit;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CashDepositRepository;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.service.report.DailyCommercialReportPersistence;
import com.optimize.elykia.core.service.report.DailyOperationService;
import com.optimize.elykia.core.util.UserProfilConstant;
import com.optimize.elykia.core.service.accounting.CashDepositCatchupAllocator.CatchupCap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CashDepositServiceTest {

    @Mock private CashDepositRepository cashDepositRepository;
    @Mock private DailyCommercialReportRepository dailyReportRepository;
    @Mock private DailyCommercialReportPersistence reportPersistence;
    @Mock private DailyOperationService dailyOperationService;
    @Mock private UserService userService;
    @Mock private CashDepositCatchupService catchupService;
    @Mock private User currentUser;

    @BeforeEach
    void noCatchupsByDefault() {
        lenient().when(catchupService.caps(any(), any())).thenReturn(List.of());
        lenient().when(catchupService.openTontine(any())).thenReturn(0.0);
    }

    @Test
    void createDeposit_appliesCategorySplitToDailyReportAndRecordsCashDepositOperation() {
        // Given
        CashDepositService service = service();
        LocalDate date = LocalDate.of(2026, 8, 19);
        CashDeposit deposit = deposit(date, "commercial.a", 1_000.0, 600.0, 300.0, 100.0, 0.0);
        DailyCommercialReport report = new DailyCommercialReport();
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("gestionnaire.a");
        when(cashDepositRepository.existsByReference("DEP-001")).thenReturn(false);
        when(dailyReportRepository.findByDateAndCommercialUsername(date, "commercial.a")).thenReturn(Optional.of(report));
        when(reportPersistence.save(report)).thenReturn(report);
        when(cashDepositRepository.save(deposit)).thenAnswer(invocation -> {
            CashDeposit saved = invocation.getArgument(0);
            saved.setId(41L);
            return saved;
        });

        // When
        CashDeposit saved = service.createDeposit(deposit);

        // Then
        assertSame(deposit, saved);
        assertEquals("gestionnaire.a", saved.getReceivedBy());
        assertEquals("DEP-001", saved.getReference());
        assertSame(report, saved.getDailyReport());
        assertEquals(1_000.0, report.getTotalAmountDeposited());
        assertEquals(600.0, report.getTotalCreditAmountDeposited());
        assertEquals(300.0, report.getTotalTontineAmountDeposited());
        assertEquals(100.0, report.getTotalNewBalanceAmountDeposited());
        assertEquals(0.0, report.getTotalSurplusAmountDeposited());
        verify(reportPersistence).save(report);
        verify(dailyOperationService).logOperation(
                eq("commercial.a"), eq(OperationType.CASH_DEPOSIT), eq(1_000.0), eq("Versement 41"),
                contains("Crédit: 600"));
    }

    @Test
    void createDeposit_returnsExistingReferenceWithoutMutatingDailyReportOrWritingAnotherOperation() {
        // Given
        CashDepositService service = service();
        CashDeposit duplicate = deposit(LocalDate.of(2026, 8, 19), "commercial.a", 1_000.0, 1_000.0, 0.0, 0.0, 0.0);
        CashDeposit existing = deposit(LocalDate.of(2026, 8, 18), "commercial.a", 1_000.0, 1_000.0, 0.0, 0.0, 0.0);
        existing.setId(12L);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("gestionnaire.a");
        when(cashDepositRepository.existsByReference("DEP-001")).thenReturn(true);
        when(cashDepositRepository.findByReference("DEP-001")).thenReturn(Optional.of(existing));

        // When
        CashDeposit returned = service.createDeposit(duplicate);

        // Then
        assertSame(existing, returned);
        verify(dailyReportRepository, never()).findByDateAndCommercialUsername(any(), any());
        verify(reportPersistence, never()).save(any());
        verify(cashDepositRepository, never()).save(any());
        verify(dailyOperationService, never()).logOperation(any(), any(), any(), any(), any());
    }

    @Test
    void cancelDeposit_createsNegativeCounterpartAndReversesTheSameDailyReportCategories() {
        // Given
        CashDepositService service = service();
        LocalDate date = LocalDate.now();
        CashDeposit original = deposit(date, "commercial.a", 1_000.0, 600.0, 300.0, 100.0, 0.0);
        original.setId(52L);
        DailyCommercialReport report = new DailyCommercialReport();
        report.setTotalAmountDeposited(1_000.0);
        report.setTotalCreditAmountDeposited(600.0);
        report.setTotalTontineAmountDeposited(300.0);
        report.setTotalNewBalanceAmountDeposited(100.0);
        report.setTotalSurplusAmountDeposited(0.0);
        when(cashDepositRepository.findById(52L)).thenReturn(Optional.of(original));
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(true);
        when(currentUser.getUsername()).thenReturn("gestionnaire.a");
        when(cashDepositRepository.existsByReference("CANCEL-DEP-001")).thenReturn(false);
        when(dailyReportRepository.findByDateAndCommercialUsername(date, "commercial.a")).thenReturn(Optional.of(report));
        when(reportPersistence.save(report)).thenReturn(report);
        when(cashDepositRepository.save(any(CashDeposit.class))).thenAnswer(invocation -> {
            CashDeposit saved = invocation.getArgument(0);
            saved.setId(53L);
            return saved;
        });
        ArgumentCaptor<CashDeposit> cancellationCaptor = ArgumentCaptor.forClass(CashDeposit.class);

        // When
        CashDeposit cancellation = service.cancelDeposit(52L);

        // Then
        assertEquals(53L, cancellation.getId());
        assertEquals(-1_000.0, cancellation.getAmount());
        assertEquals(-600.0, cancellation.getCreditAmount());
        assertEquals(-300.0, cancellation.getTontineAmount());
        assertEquals(-100.0, cancellation.getNewBalanceAmount());
        assertEquals("CANCEL-DEP-001", cancellation.getReference());
        assertEquals("gestionnaire.a", cancellation.getReceivedBy());
        assertSame(report, cancellation.getDailyReport());
        assertEquals(0.0, report.getTotalAmountDeposited());
        assertEquals(0.0, report.getTotalCreditAmountDeposited());
        assertEquals(0.0, report.getTotalTontineAmountDeposited());
        assertEquals(0.0, report.getTotalNewBalanceAmountDeposited());
        verify(cashDepositRepository).save(cancellationCaptor.capture());
        assertSame(cancellation, cancellationCaptor.getValue());
        verify(dailyOperationService).logOperation(
                eq("commercial.a"), eq(OperationType.CASH_DEPOSIT_CANCEL), eq(-1_000.0),
                eq("Annulation Versement N° 52"), contains("gestionnaire.a"));
    }

    @Test
    void createDeposit_splitsTontineCatchupsOntoTheirCollectionDates() {
        CashDepositService service = service();
        LocalDate captureDate = LocalDate.of(2026, 10, 22);
        LocalDate older = LocalDate.of(2026, 10, 20);
        LocalDate newer = LocalDate.of(2026, 10, 21);
        CashDeposit deposit = deposit(captureDate, "commercial.a", 1_500.0, 200.0, 1_300.0, 0.0, 0.0);
        DailyCommercialReport today = new DailyCommercialReport();
        today.setTontineCollectionsAmount(500.0);
        DailyCommercialReport report20 = new DailyCommercialReport();
        DailyCommercialReport report21 = new DailyCommercialReport();
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("gestionnaire.a");
        when(cashDepositRepository.existsByReference("DEP-001")).thenReturn(false);
        when(dailyReportRepository.findByDateAndCommercialUsername(captureDate, "commercial.a"))
                .thenReturn(Optional.of(today));
        when(dailyReportRepository.findByDateAndCommercialUsername(older, "commercial.a"))
                .thenReturn(Optional.of(report20));
        when(dailyReportRepository.findByDateAndCommercialUsername(newer, "commercial.a"))
                .thenReturn(Optional.of(report21));
        when(catchupService.openTontine(today)).thenReturn(500.0);
        when(catchupService.caps("commercial.a", captureDate)).thenReturn(List.of(
                new CatchupCap(older, 400.0, 400.0, 400.0),
                new CatchupCap(newer, 400.0, 300.0, 300.0)));
        when(reportPersistence.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(cashDepositRepository.save(any(CashDeposit.class))).thenAnswer(invocation -> {
            CashDeposit saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(saved.getParentDeposit() == null ? 80L : 81L);
            }
            return saved;
        });

        CashDeposit saved = service.createDeposit(deposit);

        assertEquals(800.0, saved.getAmount());
        assertEquals(200.0, saved.getCreditAmount());
        assertEquals(600.0, saved.getTontineAmount());
        assertEquals(captureDate, saved.getCaptureDate());
        assertNotNull(saved.getDepositGroupId());
        assertEquals(800.0, today.getTotalAmountDeposited());
        assertEquals(600.0, today.getTotalTontineAmountDeposited());
        assertEquals(400.0, report20.getTotalTontineAmountDeposited());
        assertEquals(300.0, report21.getTotalTontineAmountDeposited());
        verify(dailyOperationService).logOperation(
                eq("commercial.a"), eq(OperationType.CASH_DEPOSIT), eq(400.0), any(), any(),
                eq(0.0), eq(0.0), eq(older));
        verify(dailyOperationService).logOperation(
                eq("commercial.a"), eq(OperationType.CASH_DEPOSIT), eq(1_500.0), eq("Versement 80"),
                contains("Rattrapages tontine"));
    }

    @Test
    void cancelDeposit_acceptsAdminProfile() {
        CashDepositService service = service();
        LocalDate date = LocalDate.now();
        CashDeposit original = deposit(date, "commercial.a", 400.0, 400.0, 0.0, 0.0, 0.0);
        original.setId(60L);
        DailyCommercialReport report = new DailyCommercialReport();
        report.setTotalAmountDeposited(400.0);
        report.setTotalCreditAmountDeposited(400.0);
        when(cashDepositRepository.findById(60L)).thenReturn(Optional.of(original));
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(currentUser.is(UserProfilConstant.ADMIN)).thenReturn(true);
        when(currentUser.getUsername()).thenReturn("admin.a");
        when(cashDepositRepository.existsByReference("CANCEL-DEP-001")).thenReturn(false);
        when(dailyReportRepository.findByDateAndCommercialUsername(date, "commercial.a")).thenReturn(Optional.of(report));
        when(reportPersistence.save(report)).thenReturn(report);
        when(cashDepositRepository.save(any(CashDeposit.class))).thenAnswer(invocation -> {
            CashDeposit saved = invocation.getArgument(0);
            saved.setId(61L);
            return saved;
        });

        CashDeposit cancellation = service.cancelDeposit(60L);

        assertEquals(-400.0, cancellation.getAmount());
        assertEquals("admin.a", cancellation.getReceivedBy());
        assertEquals(0.0, report.getTotalAmountDeposited());
    }

    @Test
    void cancelDeposit_rejectsUserWithoutManagerProfileBeforeAnyAccountingMutation() {
        // Given
        CashDepositService service = service();
        CashDeposit original = deposit(LocalDate.now(), "commercial.a", 1_000.0, 1_000.0, 0.0, 0.0, 0.0);
        when(cashDepositRepository.findById(9L)).thenReturn(Optional.of(original));
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);

        // When
        RuntimeException exception = assertThrows(RuntimeException.class, () -> service.cancelDeposit(9L));

        // Then
        assertTrue(exception.getMessage().contains("gestionnaire"));
        verify(dailyReportRepository, never()).findByDateAndCommercialUsername(any(), any());
        verify(reportPersistence, never()).save(any());
        verify(cashDepositRepository, never()).save(any());
        verify(dailyOperationService, never()).logOperation(any(), any(), any(), any(), any());
    }

    private CashDepositService service() {
        return new CashDepositService(cashDepositRepository, dailyReportRepository, reportPersistence,
                dailyOperationService, userService, catchupService);
    }

    private CashDeposit deposit(LocalDate date, String commercial, double amount, double credit,
            double tontine, double newBalance, double surplus) {
        CashDeposit deposit = new CashDeposit();
        deposit.setDate(date);
        deposit.setCommercialUsername(commercial);
        deposit.setAmount(amount);
        deposit.setCreditAmount(credit);
        deposit.setTontineAmount(tontine);
        deposit.setNewBalanceAmount(newBalance);
        deposit.setSurplusAmount(surplus);
        deposit.setReference("DEP-001");
        return deposit;
    }
}
