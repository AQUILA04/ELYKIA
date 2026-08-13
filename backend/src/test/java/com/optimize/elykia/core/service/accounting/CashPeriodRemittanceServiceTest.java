package com.optimize.elykia.core.service.accounting;

import com.optimize.elykia.core.dto.report.CashPeriodRemittanceDto;
import com.optimize.elykia.core.entity.expense.Expense;
import com.optimize.elykia.core.entity.report.CashDeposit;
import com.optimize.elykia.core.entity.report.CashPeriodRemittance;
import com.optimize.elykia.core.enumaration.RemittanceInitiator;
import com.optimize.elykia.core.enumaration.RemittanceStatus;
import com.optimize.elykia.core.mapper.ExpenseMapper;
import com.optimize.elykia.core.repository.CashDepositRepository;
import com.optimize.elykia.core.repository.CashPeriodRemittanceExpenseRepository;
import com.optimize.elykia.core.repository.CashPeriodRemittanceRepository;
import com.optimize.elykia.core.repository.ExpenseRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CashPeriodRemittanceServiceTest {

    @Mock
    private CashPeriodRemittanceRepository repository;
    @Mock
    private CashDepositRepository cashDepositRepository;
    @Mock
    private CashPeriodRemittanceExpenseRepository remittanceExpenseRepository;
    @Mock
    private ExpenseRepository expenseRepository;
    @Mock
    private ExpenseMapper expenseMapper;
    @Mock
    private UserService userService;

    @InjectMocks
    private CashPeriodRemittanceService service;

    private User secretary;

    @BeforeEach
    void setUp() {
        secretary = mock(User.class);
    }

    @Test
    void submitBySecretary_createsPendingRemittance() {
        when(userService.getCurrentUser()).thenReturn(secretary);
        when(secretary.is(UserProfilConstant.SECRETARY)).thenReturn(true);
        when(repository.existsByYearAndMonthAndStatus(2026, 3, RemittanceStatus.PENDING)).thenReturn(false);

        CashDeposit deposit = buildDeposit(1000.0, 700.0, 200.0, 100.0);
        when(cashDepositRepository.findUnremittedDepositsByPeriod(any(), any()))
                .thenReturn(List.of(deposit));
        when(repository.save(any())).thenAnswer(invocation -> {
            CashPeriodRemittance remittance = invocation.getArgument(0);
            remittance.setId(1L);
            return remittance;
        });

        var dto = service.submitBySecretary(2026, 3);

        assertEquals(RemittanceStatus.PENDING, dto.getStatus());
        assertEquals(1000.0, dto.getTotalAmount());
        verify(cashDepositRepository).save(deposit);
        assertEquals(1L, deposit.getRemittance().getId());
    }

    @Test
    void submitBySecretary_withExpenses_calculatesNet() {
        when(userService.getCurrentUser()).thenReturn(secretary);
        when(secretary.is(UserProfilConstant.SECRETARY)).thenReturn(true);
        when(repository.existsByYearAndMonthAndStatus(2026, 4, RemittanceStatus.PENDING)).thenReturn(false);

        CashDeposit deposit = buildDeposit(5000.0, 3000.0, 1000.0, 1000.0);
        when(cashDepositRepository.findUnremittedDepositsByPeriod(any(), any()))
                .thenReturn(List.of(deposit));
        when(remittanceExpenseRepository.findAllLinkedExpenseIds()).thenReturn(Collections.emptySet());

        Expense expense1 = new Expense();
        expense1.setId(10L);
        expense1.setAmount(BigDecimal.valueOf(1500));
        Expense expense2 = new Expense();
        expense2.setId(11L);
        expense2.setAmount(BigDecimal.valueOf(500));
        when(expenseRepository.findAllById(List.of(10L, 11L))).thenReturn(List.of(expense1, expense2));

        when(repository.save(any())).thenAnswer(invocation -> {
            CashPeriodRemittance r = invocation.getArgument(0);
            r.setId(2L);
            return r;
        });
        when(remittanceExpenseRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var dto = service.submitBySecretary(2026, 4, List.of(10L, 11L));

        assertEquals(RemittanceStatus.PENDING, dto.getStatus());
        assertEquals(5000.0, dto.getTotalAmount());
        assertEquals(2000.0, dto.getExpenseAmount());
        assertEquals(3000.0, dto.getNetAmount());
    }

    @Test
    void submitBySecretary_rejectsNetNegative() {
        when(userService.getCurrentUser()).thenReturn(secretary);
        when(secretary.is(UserProfilConstant.SECRETARY)).thenReturn(true);
        when(repository.existsByYearAndMonthAndStatus(2026, 5, RemittanceStatus.PENDING)).thenReturn(false);

        CashDeposit deposit = buildDeposit(100.0, 50.0, 30.0, 20.0);
        when(cashDepositRepository.findUnremittedDepositsByPeriod(any(), any()))
                .thenReturn(List.of(deposit));
        when(remittanceExpenseRepository.findAllLinkedExpenseIds()).thenReturn(Collections.emptySet());

        Expense expense = new Expense();
        expense.setId(20L);
        expense.setAmount(BigDecimal.valueOf(500));
        when(expenseRepository.findAllById(List.of(20L))).thenReturn(List.of(expense));

        assertThrows(RuntimeException.class, () -> service.submitBySecretary(2026, 5, List.of(20L)));
    }

    @Test
    void submitBySecretary_rejectsWhenPendingExists() {
        when(userService.getCurrentUser()).thenReturn(secretary);
        when(secretary.is(UserProfilConstant.SECRETARY)).thenReturn(true);
        when(repository.existsByYearAndMonthAndStatus(2026, 3, RemittanceStatus.PENDING)).thenReturn(true);

        assertThrows(RuntimeException.class, () -> service.submitBySecretary(2026, 3));
    }

    @Test
    void submitBySecretary_allowsSecondRemittanceAfterFirstReceived() {
        when(userService.getCurrentUser()).thenReturn(secretary);
        when(secretary.is(UserProfilConstant.SECRETARY)).thenReturn(true);
        when(repository.existsByYearAndMonthAndStatus(2026, 8, RemittanceStatus.PENDING)).thenReturn(false);

        CashDeposit newDeposit = buildDeposit(50000.0, 50000.0, 0.0, 0.0);
        when(cashDepositRepository.findUnremittedDepositsByPeriod(any(), any()))
                .thenReturn(List.of(newDeposit));
        when(repository.save(any())).thenAnswer(invocation -> {
            CashPeriodRemittance remittance = invocation.getArgument(0);
            remittance.setId(10L);
            return remittance;
        });

        var dto = service.submitBySecretary(2026, 8);

        assertEquals(50000.0, dto.getTotalAmount());
        assertEquals(RemittanceStatus.PENDING, dto.getStatus());
    }

    @Test
    void getSummary_exposesUnremittedAfterReceivedRemittance() {
        Object[] unremittedTotals = new Object[]{50000.0, 50000.0, 0.0, 0.0};
        when(cashDepositRepository.sumUnremittedDepositsByPeriod(any(), any()))
                .thenReturn(Collections.singletonList(unremittedTotals));
        when(repository.findByYearAndMonthAndStatus(2026, 8, RemittanceStatus.PENDING))
                .thenReturn(Optional.empty());
        when(repository.sumReceivedTotalByYearAndMonth(2026, 8)).thenReturn(2500.0);
        when(userService.getCurrentUser()).thenReturn(secretary);
        when(secretary.is(UserProfilConstant.SECRETARY)).thenReturn(true);
        when(secretary.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(remittanceExpenseRepository.findAllLinkedExpenseIds()).thenReturn(Collections.emptySet());
        when(expenseRepository.findByExpenseDateBetween(any(), any())).thenReturn(Collections.emptyList());

        var summary = service.getSummary(2026, 8);

        assertEquals(50000.0, summary.getTotalAmount());
        assertEquals(2500.0, summary.getAlreadyRemittedAmount());
        assertTrue(summary.isCanSubmit());
        assertNull(summary.getStatus());
    }

    @Test
    void list_includesLinkedDeposits() {
        CashPeriodRemittance remittance = new CashPeriodRemittance();
        remittance.setId(7L);
        remittance.setYear(2026);
        remittance.setMonth(8);
        remittance.setTotalAmount(2500.0);
        remittance.setCreditAmount(2500.0);
        remittance.setTontineAmount(0.0);
        remittance.setNewBalanceAmount(0.0);
        remittance.setExpenseAmount(0.0);
        remittance.setNetAmount(2500.0);
        remittance.setStatus(RemittanceStatus.RECEIVED);
        remittance.setInitiatedBy(RemittanceInitiator.MANAGER);
        remittance.setReference("REM-2026-08-7");

        CashDeposit deposit = buildDeposit(2500.0, 2500.0, 0.0, 0.0);
        deposit.setId(42L);
        deposit.setCommercialUsername("COM004");
        deposit.setReference("DEP-COM004");
        deposit.setRemittance(remittance);

        Pageable pageable = Pageable.unpaged();
        when(repository.findAll(pageable)).thenReturn(new PageImpl<>(List.of(remittance), pageable, 1));
        when(cashDepositRepository.findByRemittanceIdInOrderByRemittanceIdAscCommercialUsernameAscDateAscIdAsc(List.of(7L)))
                .thenReturn(List.of(deposit));

        Page<CashPeriodRemittanceDto> page = service.list(pageable);

        assertEquals(1, page.getTotalElements());
        assertEquals(1, page.getContent().get(0).getDeposits().size());
        assertEquals("COM004", page.getContent().get(0).getDeposits().get(0).getCommercialUsername());
        assertEquals(2500.0, page.getContent().get(0).getDeposits().get(0).getAmount());
    }

    @Test
    void acknowledgeByManager_marksReceived() {
        User manager = mock(User.class);
        when(userService.getCurrentUser()).thenReturn(manager);
        when(manager.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(true);
        when(manager.getUsername()).thenReturn("manager1");

        CashPeriodRemittance remittance = new CashPeriodRemittance();
        remittance.setId(5L);
        remittance.setStatus(RemittanceStatus.PENDING);
        remittance.setYear(2026);
        remittance.setMonth(3);
        remittance.setTotalAmount(1000.0);
        remittance.setCreditAmount(700.0);
        remittance.setTontineAmount(200.0);
        remittance.setNewBalanceAmount(100.0);
        remittance.setExpenseAmount(300.0);
        remittance.setNetAmount(700.0);
        remittance.setInitiatedBy(RemittanceInitiator.SECRETARY);
        remittance.setReference("REM-2026-03-1");

        when(repository.findById(5L)).thenReturn(Optional.of(remittance));
        when(remittanceExpenseRepository.findExpenseIdsByRemittanceId(5L)).thenReturn(Set.of(10L, 11L));

        Expense e1 = new Expense();
        e1.setId(10L);
        e1.setAmount(BigDecimal.valueOf(200));
        when(expenseRepository.findAllById(Set.of(10L))).thenReturn(List.of(e1));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(remittanceExpenseRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var dto = service.acknowledgeByManager(5L, List.of(10L));

        assertEquals(RemittanceStatus.RECEIVED, dto.getStatus());
        assertEquals("manager1", dto.getReceivedBy());
        assertEquals(200.0, dto.getExpenseAmount());
        assertEquals(800.0, dto.getNetAmount());
    }

    private CashDeposit buildDeposit(double total, double credit, double tontine, double newBalance) {
        CashDeposit deposit = new CashDeposit();
        deposit.setId(1L);
        deposit.setDate(LocalDate.of(2026, 8, 13));
        deposit.setCommercialUsername("COM004");
        deposit.setAmount(total);
        deposit.setCreditAmount(credit);
        deposit.setTontineAmount(tontine);
        deposit.setNewBalanceAmount(newBalance);
        return deposit;
    }
}
