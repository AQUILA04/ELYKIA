package com.optimize.elykia.core.service.adhesion;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.AccountStatus;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.AccountRepository;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.enumaration.AdhesionType;
import com.optimize.elykia.core.enumaration.CreditPurpose;
import com.optimize.elykia.core.repository.adhesion.AdhesionBalanceMovementRepository;
import com.optimize.elykia.core.repository.adhesion.ClientAdhesionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdhesionServiceCreditGateTest {

    @Mock
    private ClientAdhesionRepository adhesionRepository;
    @Mock
    private AdhesionBalanceMovementRepository movementRepository;
    @Mock
    private ClientService clientService;
    @Mock
    private AccountRepository accountRepository;
    @Mock
    private UserService userService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private ParameterService parameterService;

    private AdhesionService service;

    @BeforeEach
    void setUp() {
        service = new AdhesionService(
                adhesionRepository,
                movementRepository,
                clientService,
                accountRepository,
                userService,
                eventPublisher,
                parameterService);
        ReflectionTestUtils.setField(service, "dividend", 6);
        ReflectionTestUtils.setField(service, "personalCeiling", 35_000d);
        ReflectionTestUtils.setField(service, "personalFee", 500d);
        ReflectionTestUtils.setField(service, "businessFee", 2_000d);
        ReflectionTestUtils.setField(service, "eventFee", 2_000d);
    }

    @Test
    void legacyModeRejectsBusinessAndEvent() {
        when(parameterService.isEnabled(AdhesionService.DUAL_CREDIT_AUTHORIZATION)).thenReturn(false);
        Client client = clientWithBalance(10_000);

        assertThrows(CustomValidationException.class,
                () -> service.assertCreditAllowed(client, CreditPurpose.BUSINESS, 1_000d));
        assertThrows(CustomValidationException.class,
                () -> service.assertCreditAllowed(client, CreditPurpose.EVENT, 1_000d));
    }

    @Test
    void legacyModeUsesAccountBalanceTimesDividend() {
        when(parameterService.isEnabled(AdhesionService.DUAL_CREDIT_AUTHORIZATION)).thenReturn(false);
        when(parameterService.isEnabled("ENABLED_ACCOUNT_BALANCE_CONTROL")).thenReturn(true);
        Client client = clientWithBalance(1_000);

        assertDoesNotThrow(() -> service.assertCreditAllowed(client, CreditPurpose.PERSONAL, 6_000d));
        assertThrows(ApplicationException.class,
                () -> service.assertCreditAllowed(client, CreditPurpose.PERSONAL, 6_001d));
    }

    @Test
    void legacyModeRejectsSubscription() {
        when(parameterService.isEnabled(AdhesionService.DUAL_CREDIT_AUTHORIZATION)).thenReturn(false);

        assertThrows(CustomValidationException.class,
                () -> service.applySubscribe(7L, AdhesionType.PERSONAL, null, "ges", false));
        assertThrows(CustomValidationException.class,
                () -> service.applyTopUp(7L, AdhesionType.PERSONAL, 500, "ges", false));
    }

    private Client clientWithBalance(double balance) {
        Client client = new Client();
        client.setId(7L);
        client.setClientType(ClientType.CLIENT);
        client.setFirstname("Awa");
        client.setLastname("K.");
        Account account = new Account();
        account.setId(3L);
        account.setStatus(AccountStatus.ACTIF);
        account.setAccountBalance(balance);
        client.setAccount(account);
        return client;
    }
}
