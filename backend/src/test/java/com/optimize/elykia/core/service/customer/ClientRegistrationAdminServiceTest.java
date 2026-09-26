package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.client.dto.AccountDto;
import com.optimize.elykia.client.dto.AccountRespDto;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.AccountRepository;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.service.AccountService;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.customer.ClientRegistrationActivateRequest;
import com.optimize.elykia.core.dto.customer.ClientRegistrationDto;
import com.optimize.elykia.core.dto.customer.ClientRegistrationRejectRequest;
import com.optimize.elykia.core.dto.customer.CustomerInitialDepositDto;
import com.optimize.elykia.core.dto.customer.CustomerInitialDepositRejectRequest;
import com.optimize.elykia.core.entity.customer.CustomerInitialDepositSubmission;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.repository.customer.CustomerInitialDepositSubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientRegistrationAdminServiceTest {

    @Mock private ClientRepository clientRepository;
    @Mock private ClientService clientService;
    @Mock private AccountService accountService;
    @Mock private CustomerInitialDepositSubmissionRepository depositRepository;

    @InjectMocks
    private ClientRegistrationAdminService service;

    private Client pendingClient;
    private User admin;

    @BeforeEach
    void setUp() {
        pendingClient = new Client();
        pendingClient.setId(7L);
        pendingClient.setFirstname("Jean");
        pendingClient.setLastname("Dupont");
        pendingClient.setPhone("90998877");
        pendingClient.setClientType(ClientType.CLIENT);
        pendingClient.setActivationStatus(ClientActivationStatus.PENDING);
        pendingClient.setAddress("Lome");
        pendingClient.setQuarter("Tokoin");

        admin = mock(User.class);
        lenient().when(admin.getUsername()).thenReturn("ADMIN");
    }

    @Test
    void list_returnsPendingWithDepositFlag() {
        PageRequest pageable = PageRequest.of(0, 10);
        when(clientRepository.findByActivationStatusAndClientTypeAndState(
                ClientActivationStatus.PENDING, ClientType.CLIENT, State.ENABLED, pageable))
                .thenReturn(new PageImpl<>(List.of(pendingClient), pageable, 1));
        CustomerInitialDepositSubmission deposit = deposit(11L, CustomerSubmissionStatus.INITIE, 40_000.0);
        when(depositRepository.findByClientIdInAndState(List.of(7L), State.ENABLED))
                .thenReturn(List.of(deposit));

        Page<ClientRegistrationDto> page = service.list(null, true, pageable);

        assertEquals(1, page.getTotalElements());
        assertTrue(page.getContent().get(0).isHasInitialDeposit());
        assertEquals(40_000.0, page.getContent().get(0).getInitialDepositAmount());
    }

    @Test
    void list_filtersOutWithoutDepositWhenRequested() {
        PageRequest pageable = PageRequest.of(0, 10);
        when(clientRepository.findByActivationStatusAndClientTypeAndState(
                ClientActivationStatus.PENDING, ClientType.CLIENT, State.ENABLED, pageable))
                .thenReturn(new PageImpl<>(List.of(pendingClient), pageable, 1));
        when(depositRepository.findByClientIdInAndState(List.of(7L), State.ENABLED)).thenReturn(List.of());

        Page<ClientRegistrationDto> page = service.list(ClientActivationStatus.PENDING, true, pageable);

        assertEquals(0, page.getContent().size());
    }

    @Test
    void get_returnsDto() {
        when(clientService.getById(7L)).thenReturn(pendingClient);
        when(depositRepository.findByClientIdInAndState(List.of(7L), State.ENABLED)).thenReturn(List.of());

        ClientRegistrationDto dto = service.get(7L);

        assertEquals(7L, dto.getClientId());
        assertEquals("Jean Dupont", dto.getFullName());
        assertEquals("PENDING", dto.getActivationStatus());
    }

    @Test
    void activate_assignsCollectorValidatesDepositAndCreatesAccount() {
        when(clientService.getById(7L)).thenReturn(pendingClient);
        when(clientRepository.save(pendingClient)).thenReturn(pendingClient);
        CustomerInitialDepositSubmission deposit = deposit(11L, CustomerSubmissionStatus.INITIE, 75_000.0);
        when(depositRepository.findByClientIdInAndState(List.of(7L), State.ENABLED))
                .thenReturn(List.of(deposit));
        when(depositRepository.save(deposit)).thenReturn(deposit);
        when(clientRepository.findById(7L)).thenReturn(Optional.of(pendingClient));
        AccountRepository accountRepository = mock(AccountRepository.class);
        when(accountService.getRepository()).thenReturn(accountRepository);
        when(accountRepository.count()).thenReturn(12L);
        when(accountService.syncAccount(any(AccountDto.class))).thenReturn(mock(AccountRespDto.class));

        ClientRegistrationActivateRequest request = new ClientRegistrationActivateRequest();
        request.setCollector("COM001");
        request.setTontineCollector("COM002");
        request.setValidateInitialDeposit(true);

        ClientRegistrationDto dto = service.activate(admin, 7L, request);

        assertEquals(ClientActivationStatus.ACTIVE, pendingClient.getActivationStatus());
        assertEquals("COM001", pendingClient.getCollector());
        assertEquals("COM002", pendingClient.getTontineCollector());
        assertEquals(CustomerSubmissionStatus.VALIDE, deposit.getStatus());
        assertEquals("ACTIVE", dto.getActivationStatus());
        ArgumentCaptor<AccountDto> accountCaptor = ArgumentCaptor.forClass(AccountDto.class);
        verify(accountService).syncAccount(accountCaptor.capture());
        assertEquals(75_000.0, accountCaptor.getValue().getAccountBalance());
    }

    @Test
    void activate_rejectsNonPending() {
        pendingClient.setActivationStatus(ClientActivationStatus.ACTIVE);
        when(clientService.getById(7L)).thenReturn(pendingClient);
        ClientRegistrationActivateRequest request = new ClientRegistrationActivateRequest();
        request.setCollector("COM001");

        assertThrows(CustomValidationException.class, () -> service.activate(admin, 7L, request));
    }

    @Test
    void reject_setsRejectedStatusAndReason() {
        when(clientService.getById(7L)).thenReturn(pendingClient);
        when(clientRepository.save(pendingClient)).thenReturn(pendingClient);
        when(depositRepository.findByClientIdInAndState(List.of(7L), State.ENABLED)).thenReturn(List.of());

        ClientRegistrationRejectRequest request = new ClientRegistrationRejectRequest();
        request.setReason("Dossier incomplet");

        ClientRegistrationDto dto = service.reject(admin, 7L, request);

        assertEquals(ClientActivationStatus.REJECTED, pendingClient.getActivationStatus());
        assertEquals("Dossier incomplet", pendingClient.getActivationRejectionReason());
        assertEquals("ADMIN", pendingClient.getActivationRejectedBy());
        assertEquals("REJECTED", dto.getActivationStatus());
    }

    @Test
    void validateDeposit_marksValide() {
        CustomerInitialDepositSubmission deposit = deposit(11L, CustomerSubmissionStatus.INITIE, 10_000.0);
        when(depositRepository.findById(11L)).thenReturn(Optional.of(deposit));
        when(depositRepository.save(deposit)).thenReturn(deposit);
        when(clientService.getById(7L)).thenReturn(pendingClient);

        CustomerInitialDepositDto dto = service.validateDeposit(admin, 11L);

        assertEquals(CustomerSubmissionStatus.VALIDE, dto.getStatus());
        assertEquals("ADMIN", deposit.getValidatedBy());
    }

    @Test
    void rejectDeposit_marksRejete() {
        CustomerInitialDepositSubmission deposit = deposit(11L, CustomerSubmissionStatus.INITIE, 10_000.0);
        when(depositRepository.findById(11L)).thenReturn(Optional.of(deposit));
        when(depositRepository.save(deposit)).thenReturn(deposit);

        CustomerInitialDepositRejectRequest request = new CustomerInitialDepositRejectRequest();
        request.setReason("Reference invalide");

        CustomerInitialDepositDto dto = service.rejectDeposit(admin, 11L, request);

        assertEquals(CustomerSubmissionStatus.REJETE, dto.getStatus());
        assertEquals("Reference invalide", dto.getRejectionReason());
    }

    private CustomerInitialDepositSubmission deposit(Long id, CustomerSubmissionStatus status, double amount) {
        CustomerInitialDepositSubmission deposit = new CustomerInitialDepositSubmission();
        deposit.setId(id);
        deposit.setClientId(7L);
        deposit.setStatus(status);
        deposit.setMobileMoneyAmount(amount);
        deposit.setMobileMoneyPhone("90123456");
        deposit.setMobileMoneyReference("REF");
        return deposit;
    }
}
