package com.optimize.elykia.core.service.debt;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserPermission;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.debt.CreateCashDebtRequestDto;
import com.optimize.elykia.core.dto.debt.DebtDocumentDto;
import com.optimize.elykia.core.dto.debt.DebtSettleRequestDto;
import com.optimize.elykia.core.dto.debt.DebtSettlementDto;
import com.optimize.elykia.core.entity.debt.DebtDocument;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.enumaration.DebtPeriodGrain;
import com.optimize.elykia.core.enumaration.DebtSettlementMode;
import com.optimize.elykia.core.enumaration.DebtStatus;
import com.optimize.elykia.core.enumaration.DebtType;
import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.repository.DebtDocumentRepository;
import com.optimize.elykia.core.repository.DebtSettlementRepository;
import com.optimize.elykia.core.util.UserPermissionConstant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DebtServiceCashAndSettlementTest {

    @Mock private DebtDocumentRepository debtDocumentRepository;
    @Mock private DebtSettlementRepository debtSettlementRepository;
    @Mock private CommercialMonthlyStockRepository commercialMonthlyStockRepository;
    @Mock private DailyCommercialReportRepository dailyCommercialReportRepository;
    @Mock private CreditRepository creditRepository;
    @Mock private UserService userService;

    private DebtService debtService;
    private final AtomicLong idSeq = new AtomicLong(100);
    private final java.util.Map<Long, DebtDocument> savedDocs = new java.util.HashMap<>();

    @BeforeEach
    void setUp() {
        savedDocs.clear();
        debtService = new DebtService(
                debtDocumentRepository,
                debtSettlementRepository,
                commercialMonthlyStockRepository,
                dailyCommercialReportRepository,
                creditRepository,
                userService);
        User user = mock(User.class);
        UserPermission permission = mock(UserPermission.class);
        when(permission.getName()).thenReturn(UserPermissionConstant.DEBT_MANAGEMENT);
        when(user.getPermissions()).thenReturn(Set.of(permission));
        when(user.getUsername()).thenReturn("gestionnaire");
        when(userService.getCurrentUser()).thenReturn(user);
        when(debtDocumentRepository.existsByReference(anyString())).thenReturn(false);
        when(debtDocumentRepository.save(any())).thenAnswer(inv -> {
            DebtDocument doc = inv.getArgument(0);
            if (doc.getId() == null) {
                doc.setId(idSeq.getAndIncrement());
            }
            savedDocs.put(doc.getId(), doc);
            return doc;
        });
        when(debtDocumentRepository.findById(anyLong()))
                .thenAnswer(inv -> Optional.ofNullable(savedDocs.get(inv.getArgument(0))));
        when(debtDocumentRepository.findByIdWithLines(anyLong()))
                .thenAnswer(inv -> Optional.ofNullable(savedDocs.get(inv.getArgument(0))));
        when(debtSettlementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(debtSettlementRepository.existsByReference(anyString())).thenReturn(false);
        when(creditRepository.sumCashSalesAmountBetween(anyString(), any(), any(), eq(State.ENABLED)))
                .thenReturn(0D);
    }

    @Test
    void createCashDebtForDay_createsShortageIncludingCashSales() {
        LocalDate day = LocalDate.now().minusDays(2);
        DailyCommercialReport report = new DailyCommercialReport();
        report.setDate(day);
        report.setCommercialUsername("promo1");
        report.setTotalAmountToDeposit(8000.0);
        report.setTotalAmountDeposited(5000.0);
        report.setTotalAdvancesAmount(4000.0);
        report.setCollectionsAmount(3000.0);
        report.setTontineCollectionsAmount(1000.0);
        report.setNewAccountsBalance(0.0);

        when(dailyCommercialReportRepository.findByDateAndCommercialUsername(day, "promo1"))
                .thenReturn(Optional.of(report));
        when(creditRepository.sumCashSalesAmountBetween(eq("promo1"), eq(day), eq(day), eq(State.ENABLED)))
                .thenReturn(2000.0);
        when(debtDocumentRepository.findActiveCashMonth(eq("promo1"), anyInt(), anyInt()))
                .thenReturn(Optional.empty());
        when(debtDocumentRepository.findActiveCashDay("promo1", day)).thenReturn(Optional.empty());
        when(debtDocumentRepository.findOpenByHolderAndType(anyString(), any(), anyList()))
                .thenReturn(List.of());

        CreateCashDebtRequestDto request = new CreateCashDebtRequestDto();
        request.setCommercialUsername("promo1");
        request.setPeriodGrain(DebtPeriodGrain.DAY);
        request.setDay(day);

        DebtDocumentDto dto = debtService.createCashDebt(request);

        // declared = 8000 + 2000 cash sales, deposited = 5000 → shortage 5000
        assertEquals(DebtType.CASH_SHORTAGE, dto.getDebtType());
        assertEquals(5000.0, dto.getGrossAmount());
        assertEquals(DebtStatus.OPEN, dto.getStatus());
    }

    @Test
    void createCashDebtForMonth_excludesDaysAlreadyConstituted() {
        YearMonth past = YearMonth.now().minusMonths(1);
        LocalDate day1 = past.atDay(1);
        LocalDate day2 = past.atDay(2);

        DailyCommercialReport r1 = report(day1, 3000, 1000);
        DailyCommercialReport r2 = report(day2, 4000, 500);

        when(debtDocumentRepository.findActiveCashMonth("promo1", past.getYear(), past.getMonthValue()))
                .thenReturn(Optional.empty());
        when(debtDocumentRepository.findActiveCashDaysInMonth("promo1", past.getYear(), past.getMonthValue()))
                .thenReturn(List.of(day1));
        when(dailyCommercialReportRepository.findByCommercialUsernameAndDateBetweenOrderByDateAsc(
                eq("promo1"), eq(past.atDay(1)), eq(past.atEndOfMonth())))
                .thenReturn(List.of(r1, r2));
        when(creditRepository.sumCashSalesAmountBetween(anyString(), any(), any(), eq(State.ENABLED)))
                .thenReturn(0D);
        when(debtDocumentRepository.findOpenByHolderAndType(anyString(), any(), anyList()))
                .thenReturn(List.of());

        CreateCashDebtRequestDto request = new CreateCashDebtRequestDto();
        request.setCommercialUsername("promo1");
        request.setPeriodGrain(DebtPeriodGrain.MONTH);
        request.setYear(past.getYear());
        request.setMonth(past.getMonthValue());

        DebtDocumentDto dto = debtService.createCashDebt(request);

        // day1 excluded → only day2: 4000 - 500 = 3500 shortage
        assertEquals(DebtType.CASH_SHORTAGE, dto.getDebtType());
        assertEquals(3500.0, dto.getGrossAmount());
    }

    @Test
    void createCashDebtForDay_blockedWhenMonthAlreadyExists() {
        LocalDate day = LocalDate.now().minusDays(3);
        DebtDocument monthDebt = new DebtDocument();
        monthDebt.setId(99L);
        when(debtDocumentRepository.findActiveCashMonth(eq("promo1"), anyInt(), anyInt()))
                .thenReturn(Optional.of(monthDebt));

        CreateCashDebtRequestDto request = new CreateCashDebtRequestDto();
        request.setCommercialUsername("promo1");
        request.setPeriodGrain(DebtPeriodGrain.DAY);
        request.setDay(day);

        assertThrows(CustomValidationException.class, () -> debtService.createCashDebt(request));
    }

    @Test
    void settleCash_partialThenFullUpdatesStatus() {
        DebtDocument debt = openShortage(1L, "promo1", 10000.0);

        DebtSettleRequestDto partial = new DebtSettleRequestDto();
        partial.setDebtIds(List.of(1L));
        partial.setSettlementMode(DebtSettlementMode.CASH);
        partial.setAmount(4000.0);

        DebtSettlementDto first = debtService.settle(partial);
        assertEquals(4000.0, first.getAmount());
        assertEquals(4000.0, debt.getPaidAmount());
        assertEquals(6000.0, debt.getRemainingAmount());
        assertEquals(DebtStatus.PARTIALLY_SETTLED, debt.getStatus());

        DebtSettleRequestDto rest = new DebtSettleRequestDto();
        rest.setDebtIds(List.of(1L));
        rest.setSettlementMode(DebtSettlementMode.CASH);

        debtService.settle(rest);
        assertEquals(10000.0, debt.getPaidAmount());
        assertEquals(0.0, debt.getRemainingAmount());
        assertEquals(DebtStatus.SETTLED, debt.getStatus());
    }

    @Test
    void cancelDebt_rejectsWhenAlreadyPartiallyPaid() {
        DebtDocument debt = openShortage(2L, "promo1", 5000.0);
        debt.setPaidAmount(1000.0);
        debt.refreshRemainingAndStatus();

        assertThrows(CustomValidationException.class, () -> debtService.cancelDebt(2L, "oops"));
    }

    @Test
    void surplusCreation_autoOffsetsOldestShortage() {
        LocalDate day = LocalDate.now().minusDays(5);
        DailyCommercialReport report = new DailyCommercialReport();
        report.setDate(day);
        report.setCommercialUsername("promo1");
        report.setTotalAmountToDeposit(1000.0);
        report.setTotalAmountDeposited(4000.0);

        DebtDocument shortage = openShortage(10L, "promo1", 2000.0);

        when(dailyCommercialReportRepository.findByDateAndCommercialUsername(day, "promo1"))
                .thenReturn(Optional.of(report));
        when(debtDocumentRepository.findActiveCashMonth(eq("promo1"), anyInt(), anyInt()))
                .thenReturn(Optional.empty());
        when(debtDocumentRepository.findActiveCashDay("promo1", day)).thenReturn(Optional.empty());
        when(debtDocumentRepository.findOpenByHolderAndType(eq("promo1"), eq(DebtType.CASH_SHORTAGE), anyList()))
                .thenReturn(List.of(shortage));

        CreateCashDebtRequestDto request = new CreateCashDebtRequestDto();
        request.setCommercialUsername("promo1");
        request.setPeriodGrain(DebtPeriodGrain.DAY);
        request.setDay(day);

        DebtDocumentDto surplus = debtService.createCashDebt(request);

        assertEquals(DebtType.CASH_SURPLUS, surplus.getDebtType());
        assertEquals(3000.0, surplus.getGrossAmount());
        // 2000 offset onto shortage
        assertEquals(2000.0, shortage.getOffsetAmount());
        assertEquals(DebtStatus.SETTLED, shortage.getStatus());
    }

    private DailyCommercialReport report(LocalDate day, double toDeposit, double deposited) {
        DailyCommercialReport r = new DailyCommercialReport();
        r.setDate(day);
        r.setCommercialUsername("promo1");
        r.setTotalAmountToDeposit(toDeposit);
        r.setTotalAmountDeposited(deposited);
        r.setTotalAdvancesAmount(0.0);
        r.setCollectionsAmount(0.0);
        r.setTontineCollectionsAmount(0.0);
        r.setNewAccountsBalance(0.0);
        return r;
    }

    private DebtDocument openShortage(Long id, String holder, double amount) {
        DebtDocument debt = new DebtDocument();
        debt.setId(id);
        debt.setReference("DET-TEST-" + id);
        debt.setHolderUsername(holder);
        debt.setHolderProfile(com.optimize.elykia.core.enumaration.DebtHolderProfile.COMMERCIAL);
        debt.setDebtType(DebtType.CASH_SHORTAGE);
        debt.setPeriodGrain(DebtPeriodGrain.DAY);
        debt.setPeriodYear(LocalDate.now().getYear());
        debt.setPeriodMonth(LocalDate.now().getMonthValue());
        debt.setPeriodDay(LocalDate.now().minusDays(10));
        debt.setGrossAmount(amount);
        debt.setPaidAmount(0.0);
        debt.setOffsetAmount(0.0);
        debt.refreshRemainingAndStatus();
        savedDocs.put(id, debt);
        return debt;
    }
}
