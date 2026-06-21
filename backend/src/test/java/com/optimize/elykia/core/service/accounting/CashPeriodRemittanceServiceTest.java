package com.optimize.elykia.core.service.accounting;

import com.optimize.elykia.core.entity.report.CashPeriodRemittance;
import com.optimize.elykia.core.enumaration.RemittanceInitiator;
import com.optimize.elykia.core.enumaration.RemittanceStatus;
import com.optimize.elykia.core.repository.CashDepositRepository;
import com.optimize.elykia.core.repository.CashPeriodRemittanceRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CashPeriodRemittanceServiceTest {

    @Mock
    private CashPeriodRemittanceRepository repository;
    @Mock
    private CashDepositRepository cashDepositRepository;
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
        assertEquals(700.0, dto.getCreditAmount());
    }

    @Test
    void submitBySecretary_rejectsDuplicatePeriod() {
        when(userService.getCurrentUser()).thenReturn(secretary);
        when(secretary.is(UserProfilConstant.SECRETARY)).thenReturn(true);
        when(repository.existsByYearAndMonth(2026, 3)).thenReturn(true);

        assertThrows(RuntimeException.class, () -> service.submitBySecretary(2026, 3));
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
        remittance.setInitiatedBy(RemittanceInitiator.SECRETARY);
        remittance.setReference("REM-2026-03");

        when(repository.findById(5L)).thenReturn(Optional.of(remittance));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var dto = service.acknowledgeByManager(5L);

        assertEquals(RemittanceStatus.RECEIVED, dto.getStatus());
        assertEquals("manager1", dto.getReceivedBy());
    }
}
