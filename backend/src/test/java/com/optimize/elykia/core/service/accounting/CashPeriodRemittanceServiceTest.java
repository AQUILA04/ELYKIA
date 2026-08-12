package com.optimize.elykia.core.service.accounting;

import com.optimize.elykia.core.entity.expense.Expense;
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

import java.math.BigDecimal;
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
        when(repository.existsByYearAndMonth(2026, 3)).thenReturn(false);
        Object[] totals = new Object[]{1000.0, 700.0, 200.0, 100.0};
        when(cashDepositRepository.sumDepositsByPeriod(any(), any()))
                .thenReturn(Collections.singletonList(totals));
        when(repository.save(any())).thenAnswer(invocation -> {
            CashPeriodRemittance remittance = invocation.getArgument(0);
            remittance.setId(1L);
            return remittance;
        });

        var dto = service.submitBySecretary(2026, 3);

        assertEquals(RemittanceStatus.PENDING, dto.getStatus());
        assertEquals(1000.0, dto.getTotalAmount());
        assertEquals(1000.0, dto.getNetAmount());
        assertEquals(0.0, dto.getExpenseAmount());
    }

    @Test
    void submitBySecretary_withExpenses_calculatesNet() {
        when(userService.getCurrentUser()).thenReturn(secretary);
        when(secretary.is(UserProfilConstant.SECRETARY)).thenReturn(true);
        when(repository.existsByYearAndMonth(2026, 4)).thenReturn(false);
        Object[] totals = new Object[]{5000.0, 3000.0, 1000.0, 1000.0};
        when(cashDepositRepository.sumDepositsByPeriod(any(), any()))
                .thenReturn(Collections.singletonList(totals));
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
        when(repository.existsByYearAndMonth(2026, 5)).thenReturn(false);
        Object[] totals = new Object[]{100.0, 50.0, 30.0, 20.0};
        when(cashDepositRepository.sumDepositsByPeriod(any(), any()))
                .thenReturn(Collections.singletonList(totals));
        when(remittanceExpenseRepository.findAllLinkedExpenseIds()).thenReturn(Collections.emptySet());

        Expense expense = new Expense();
        expense.setId(20L);
        expense.setAmount(BigDecimal.valueOf(500));
        when(expenseRepository.findAllById(List.of(20L))).thenReturn(List.of(expense));

        assertThrows(RuntimeException.class, () -> service.submitBySecretary(2026, 5, List.of(20L)));
    }

    @Test
    void submitBySecretary_rejectsDuplicatePeriod() {
        when(userService.getCurrentUser()).thenReturn(secretary);
        when(secretary.is(UserProfilConstant.SECRETARY)).thenReturn(true);
        when(repository.existsByYearAndMonth(2026, 3)).thenReturn(true);

        assertThrows(RuntimeException.class, () -> service.submitBySecretary(2026, 3));
    }

    @Test
    void submitBySecretary_rejectsAlreadyLinkedExpense() {
        when(userService.getCurrentUser()).thenReturn(secretary);
        when(secretary.is(UserProfilConstant.SECRETARY)).thenReturn(true);
        when(repository.existsByYearAndMonth(2026, 6)).thenReturn(false);
        Object[] totals = new Object[]{5000.0, 3000.0, 1000.0, 1000.0};
        when(cashDepositRepository.sumDepositsByPeriod(any(), any()))
                .thenReturn(Collections.singletonList(totals));
        when(remittanceExpenseRepository.findAllLinkedExpenseIds()).thenReturn(Set.of(30L));

        Expense expense = new Expense();
        expense.setId(30L);
        expense.setAmount(BigDecimal.valueOf(200));
        when(expenseRepository.findAllById(List.of(30L))).thenReturn(List.of(expense));

        assertThrows(RuntimeException.class, () -> service.submitBySecretary(2026, 6, List.of(30L)));
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
        remittance.setReference("REM-2026-03");

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

    @Test
    void acknowledgeByManager_rejectsAddingNewExpenses() {
        User manager = mock(User.class);
        when(userService.getCurrentUser()).thenReturn(manager);
        when(manager.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(true);

        CashPeriodRemittance remittance = new CashPeriodRemittance();
        remittance.setId(6L);
        remittance.setStatus(RemittanceStatus.PENDING);
        remittance.setTotalAmount(1000.0);

        when(repository.findById(6L)).thenReturn(Optional.of(remittance));
        when(remittanceExpenseRepository.findExpenseIdsByRemittanceId(6L)).thenReturn(Set.of(10L));

        assertThrows(RuntimeException.class, () -> service.acknowledgeByManager(6L, List.of(10L, 99L)));
    }
}
