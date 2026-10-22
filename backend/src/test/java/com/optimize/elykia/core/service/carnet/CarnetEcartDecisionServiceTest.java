package com.optimize.elykia.core.service.carnet;

import com.optimize.common.entities.enums.State;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.carnet.CarnetEcartBulkResultDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;
import com.optimize.elykia.core.enumaration.CarnetEcartStatus;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.repository.CarnetEcartDecisionRepository;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.TontineMemberFieldControlRepository;
import com.optimize.elykia.core.service.debt.DebtService;
import com.optimize.elykia.core.service.sale.CreditTimelineService;
import com.optimize.elykia.core.service.tontine.TontineService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CarnetEcartDecisionServiceTest {

    @Mock private CarnetEcartDecisionRepository decisionRepository;
    @Mock private CreditFieldControlRepository creditFieldControlRepository;
    @Mock private TontineMemberFieldControlRepository tontineFieldControlRepository;
    @Mock private CreditTimelineService creditTimelineService;
    @Mock private TontineService tontineService;
    @Mock private DebtService debtService;
    @Mock private UserService userService;
    @Mock private PlatformTransactionManager transactionManager;

    private CarnetEcartDecisionService service;

    @BeforeEach
    void setUp() {
        service = new CarnetEcartDecisionService(
                decisionRepository,
                creditFieldControlRepository,
                tontineFieldControlRepository,
                creditTimelineService,
                tontineService,
                debtService,
                userService,
                transactionManager);
        User user = org.mockito.Mockito.mock(User.class);
        when(user.getUsername()).thenReturn("com");
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        when(user.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(user.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(user.is(UserProfilConstant.SU)).thenReturn(false);
        when(userService.getCurrentUser()).thenReturn(user);
        when(transactionManager.getTransaction(any(TransactionDefinition.class)))
                .thenReturn(new SimpleTransactionStatus());
    }

    @Test
    void accept_inverseCreditIsIgnoredWithoutMiseOrShortage() {
        stubCreditControl(-500d);

        CarnetEcartBulkResultDto result = service.accept(List.of("CREDIT|7"));

        assertEquals(1, result.getIgnored().size());
        assertTrue(result.getSucceeded().isEmpty());
        verify(creditTimelineService, never()).postFieldControlRecovery(any(), any(Double.class), any());
        verify(debtService, never()).createFieldControlShortage(any(), any(), any(Double.class), any(), any(), any());
        verify(decisionRepository, never()).save(any());
    }

    @Test
    void reject_inverseCreditStoresTheDecisionWithoutMise() {
        stubCreditControl(-500d);
        when(decisionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        CarnetEcartBulkResultDto result = service.reject(List.of("CREDIT|7"), "Le carnet n'était pas à jour");

        assertEquals(1, result.getSucceeded().size());
        ArgumentCaptor<com.optimize.elykia.core.entity.carnet.CarnetEcartDecision> captor =
                ArgumentCaptor.forClass(com.optimize.elykia.core.entity.carnet.CarnetEcartDecision.class);
        verify(decisionRepository).save(captor.capture());
        assertEquals(CarnetEcartStatus.REJECTED, captor.getValue().getStatus());
        verify(creditTimelineService, never()).postFieldControlRecovery(any(), any(Double.class), any());
        verify(debtService, never()).createFieldControlShortage(any(), any(), any(Double.class), any(), any(), any());
    }

    private void stubCreditControl(double difference) {
        Credit credit = new Credit();
        credit.setId(3L);
        credit.setCollector("com");
        credit.setReference("CR-3");
        CreditFieldControl control = new CreditFieldControl();
        control.setId(7L);
        control.setCredit(credit);
        control.setDifferenceAmount(difference);
        control.setSystemTotalAmountPaid(1000d);
        control.setNotebookTotalAmount(1000d + difference);
        control.setStatus(FieldControlStatus.ECART);
        when(creditFieldControlRepository.findById(7L)).thenReturn(Optional.of(control));
        when(creditFieldControlRepository.findFirstByCredit_idAndStateOrderByObservedAtDesc(3L, State.ENABLED))
                .thenReturn(Optional.of(control));
        when(decisionRepository.findByCreditFieldControlId(7L)).thenReturn(Optional.empty());
    }
}
