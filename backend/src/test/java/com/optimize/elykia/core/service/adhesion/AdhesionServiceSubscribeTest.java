package com.optimize.elykia.core.service.adhesion;

import com.optimize.common.entities.enums.State;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.AccountStatus;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.AccountRepository;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.entity.adhesion.ClientAdhesion;
import com.optimize.elykia.core.enumaration.AdhesionSource;
import com.optimize.elykia.core.enumaration.AdhesionStatus;
import com.optimize.elykia.core.enumaration.AdhesionType;
import com.optimize.elykia.core.repository.adhesion.AdhesionBalanceMovementRepository;
import com.optimize.elykia.core.repository.adhesion.ClientAdhesionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdhesionServiceSubscribeTest {

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

    private AdhesionService service;

    @BeforeEach
    void setUp() {
        service = new AdhesionService(
                adhesionRepository,
                movementRepository,
                clientService,
                accountRepository,
                userService,
                eventPublisher);
        ReflectionTestUtils.setField(service, "dividend", 6);
        ReflectionTestUtils.setField(service, "personalCeiling", 35_000d);
        ReflectionTestUtils.setField(service, "personalFee", 500d);
        ReflectionTestUtils.setField(service, "businessFee", 2_000d);
        ReflectionTestUtils.setField(service, "eventFee", 2_000d);
    }

    @Test
    void businessSubscriptionUnlocksPersonalAndEventWithoutFee() {
        Client client = clientWithActiveAccount();
        when(clientService.getById(7L)).thenReturn(client);
        when(adhesionRepository.findByClient_IdAndAdhesionTypeAndStateAndStatusIn(
                eq(7L), any(), eq(State.ENABLED), any())).thenReturn(Optional.empty());
        when(adhesionRepository.findByClient_IdAndStateOrderByAdhesionTypeAsc(7L, State.ENABLED))
                .thenReturn(List.of());
        when(adhesionRepository.save(any(ClientAdhesion.class))).thenAnswer(invocation -> invocation.getArgument(0));
        User user = org.mockito.Mockito.mock(User.class);
        when(user.getUsername()).thenReturn("ges");
        when(user.is("GESTIONNAIRE")).thenReturn(true);
        when(userService.getCurrentUser()).thenReturn(user);

        service.subscribeAtCounter(7L, AdhesionType.BUSINESS);

        ArgumentCaptor<ClientAdhesion> captor = ArgumentCaptor.forClass(ClientAdhesion.class);
        verify(adhesionRepository, org.mockito.Mockito.atLeast(3)).save(captor.capture());
        List<ClientAdhesion> saved = captor.getAllValues();
        ClientAdhesion business = saved.stream()
                .filter(a -> a.getAdhesionType() == AdhesionType.BUSINESS)
                .findFirst()
                .orElseThrow();
        assertEquals(2_000d, business.getBalance());
        assertEquals(AdhesionStatus.ACTIVE, business.getStatus());
        assertTrue(saved.stream().anyMatch(a -> a.getAdhesionType() == AdhesionType.PERSONAL
                && a.isFeeWaived()
                && a.getBalance() == 0
                && a.getSource() == AdhesionSource.BUSINESS_UNLOCK));
        assertTrue(saved.stream().anyMatch(a -> a.getAdhesionType() == AdhesionType.EVENT
                && a.isFeeWaived()
                && a.getSource() == AdhesionSource.BUSINESS_UNLOCK));
        verify(clientService).markBusinessCreditAuthorizedFromAdhesion(7L, "ges");
    }

    private Client clientWithActiveAccount() {
        Client client = new Client();
        client.setId(7L);
        client.setClientType(ClientType.CLIENT);
        client.setCollector("com001");
        client.setFirstname("Awa");
        client.setLastname("K.");
        Account account = new Account();
        account.setId(3L);
        account.setStatus(AccountStatus.ACTIF);
        account.setClient(client);
        client.setAccount(account);
        when(accountRepository.findByClient_IdAndState(anyLong(), eq(State.ENABLED))).thenReturn(Optional.of(account));
        return client;
    }
}
