package com.optimize.elykia.client.service;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.dto.AccountDto;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.AccountStatus;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import com.optimize.elykia.client.mapper.AccountMapper;
import com.optimize.elykia.client.repository.AccountRepository;
import com.optimize.elykia.client.repository.ClientRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountServiceActivationGuardTest {

    @Mock
    private AccountRepository accountRepository;
    @Mock
    private AccountMapper accountMapper;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private ClientRepository clientRepository;
    @Mock
    private EntityManager entityManager;
    @Mock
    private Query lockQuery;

    private AccountService accountService;

    @BeforeEach
    void setUp() {
        accountService = new AccountService(accountRepository, accountMapper, eventPublisher, clientRepository,
                entityManager);
    }

    @Test
    void createAccount_rejectsPendingClient() {
        AccountDto dto = accountDto(10L);
        when(clientRepository.findById(10L)).thenReturn(Optional.of(clientWithStatus(ClientActivationStatus.PENDING)));

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> accountService.createAccount(dto));
        assertTrue(ex.getMessage().contains("pas encore validé"));
        verify(accountMapper, never()).toEntity(dto);
    }

    @Test
    void syncAccount_rejectsRejectedClient() {
        AccountDto dto = accountDto(11L);
        when(clientRepository.findById(11L)).thenReturn(Optional.of(clientWithStatus(ClientActivationStatus.REJECTED)));

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> accountService.syncAccount(dto));
        assertTrue(ex.getMessage().contains("pas encore validé"));
        verify(accountMapper, never()).toEntity(dto);
    }

    @Test
    void updateAccount_rejectsPendingClient() {
        AccountDto dto = accountDto(12L);
        when(clientRepository.findById(12L)).thenReturn(Optional.of(clientWithStatus(ClientActivationStatus.PENDING)));

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> accountService.updateAccount(dto, 1L));
        assertTrue(ex.getMessage().contains("pas encore validé"));
        verify(accountMapper, never()).toEntity(dto);
    }

    @Test
    void syncAccount_returnsExistingAccountAndNamesTheClient() {
        stubLock();
        AccountDto dto = accountDto(3038L);
        Client client = activeClient(3038L, "Jean", "Dupont");
        Account existing = existingAccount(44L, "0021190079", 1500, client);
        when(clientRepository.findById(3038L)).thenReturn(Optional.of(client));
        when(accountRepository.findFirstByClient_Id(3038L)).thenReturn(Optional.of(existing));
        when(accountMapper.toEntity(dto)).thenReturn(new Account());

        AccountCommandResult result = accountService.syncAccountResult(dto);

        assertTrue(result.alreadyExists());
        assertEquals(44L, result.account().id());
        assertEquals("0021190079", result.account().accountNumber());
        assertEquals(1500, result.account().accountBalance());
        assertEquals("Le client Jean Dupont a déjà un compte (n° 0021190079).", result.message());
        verify(accountRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void syncAccount_activatesCreatedAccountBeforeReturningIt() {
        stubLock();
        AccountDto dto = accountDto(3038L);
        Client client = activeClient(3038L, "lntris", "lupin");
        Account existing = existingAccount(3571L, "0021022942", 2000, client);
        existing.setStatus(AccountStatus.CREATED);
        when(clientRepository.findById(3038L)).thenReturn(Optional.of(client));
        when(accountRepository.findFirstByClient_Id(3038L)).thenReturn(Optional.of(existing));
        when(accountMapper.toEntity(dto)).thenReturn(new Account());
        when(accountRepository.saveAndFlush(existing)).thenReturn(existing);

        AccountCommandResult result = accountService.syncAccountResult(dto);

        assertTrue(result.alreadyExists());
        assertEquals(AccountStatus.ACTIF, existing.getStatus());
        assertEquals(AccountStatus.ACTIF, result.account().status());
        assertEquals("0021022942", result.account().accountNumber());
        assertEquals(2000, result.account().accountBalance());
        verify(accountRepository).saveAndFlush(existing);
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void createAccount_returnsExistingAccountWithoutInsert() {
        stubLock();
        AccountDto dto = accountDto(12L);
        Client client = activeClient(12L, "Awa", "Koffi");
        Account existing = existingAccount(7L, "0021020003", 500, client);
        when(clientRepository.findById(12L)).thenReturn(Optional.of(client));
        when(accountRepository.findFirstByClient_Id(12L)).thenReturn(Optional.of(existing));
        when(accountMapper.toEntity(dto)).thenReturn(new Account());

        AccountCommandResult result = accountService.createAccountResult(dto);

        assertTrue(result.alreadyExists());
        assertEquals("Le client Awa Koffi a déjà un compte (n° 0021020003).", result.message());
        assertEquals(7L, result.account().id());
        verify(accountRepository, never()).save(any());
    }

    @Test
    void createAccount_leavesCreatedAccountInactive() {
        stubLock();
        AccountDto dto = accountDto(12L);
        Client client = activeClient(12L, "Awa", "Koffi");
        Account existing = existingAccount(7L, "0021020003", 500, client);
        existing.setStatus(AccountStatus.CREATED);
        when(clientRepository.findById(12L)).thenReturn(Optional.of(client));
        when(accountRepository.findFirstByClient_Id(12L)).thenReturn(Optional.of(existing));
        when(accountMapper.toEntity(dto)).thenReturn(new Account());

        AccountCommandResult result = accountService.createAccountResult(dto);

        assertEquals(AccountStatus.CREATED, existing.getStatus());
        assertEquals(AccountStatus.CREATED, result.account().status());
        verify(accountRepository, never()).saveAndFlush(any());
    }

    @Test
    void syncAccount_namesClientByIdWhenNameIsMissing() {
        assertEquals("Le client n° 3038 a déjà un compte.",
                AccountAlreadyExistsMessage.of(activeClient(3038L, "  ", null), new Account()));
    }

    @Test
    void syncAccount_createsAccountWhenClientHasNone() {
        stubLock();
        AccountDto dto = accountDto(20L);
        Client client = activeClient(20L, "Mina", "Agbe");
        Account incoming = new Account();
        incoming.setClient(client);
        when(clientRepository.findById(20L)).thenReturn(Optional.of(client));
        when(accountRepository.findFirstByClient_Id(20L)).thenReturn(Optional.empty());
        when(accountMapper.toEntity(dto)).thenReturn(incoming);
        when(accountRepository.save(incoming)).thenAnswer(invocation -> {
            incoming.setId(90L);
            return incoming;
        });

        AccountCommandResult result = accountService.syncAccountResult(dto);

        assertFalse(result.alreadyExists());
        assertEquals(90L, result.account().id());
        assertEquals(AccountStatus.ACTIF, incoming.getStatus());
        verify(eventPublisher).publishEvent(any());
    }

    @Test
    void syncAccount_reactivatesDeletedAccount() {
        stubLock();
        AccountDto dto = accountDto(20L);
        Client client = activeClient(20L, "Mina", "Agbe");
        Account deleted = existingAccount(8L, "0021000001", 0, client);
        deleted.setState(State.DELETED);
        Account incoming = new Account();
        incoming.setClient(client);
        incoming.setAccountNumber("1234567890");
        incoming.setAccountBalance(1000);
        when(clientRepository.findById(20L)).thenReturn(Optional.of(client));
        when(accountRepository.findFirstByClient_Id(20L)).thenReturn(Optional.of(deleted));
        when(accountMapper.toEntity(dto)).thenReturn(incoming);
        when(accountRepository.saveAndFlush(deleted)).thenReturn(deleted);

        AccountCommandResult result = accountService.syncAccountResult(dto);

        assertFalse(result.alreadyExists());
        assertEquals(State.ENABLED, deleted.getState());
        assertEquals(AccountStatus.ACTIF, deleted.getStatus());
        assertEquals(1000, deleted.getAccountBalance());
        assertEquals(8L, result.account().id());
        verify(accountRepository, never()).save(any());
        verify(eventPublisher).publishEvent(any());
    }

    @Test
    void syncAccount_translatesDuplicateKeyIntoClearMessage() {
        stubLock();
        AccountDto dto = accountDto(3038L);
        Client client = activeClient(3038L, "Jean", "Dupont");
        Account incoming = new Account();
        incoming.setClient(client);
        when(clientRepository.findById(3038L)).thenReturn(Optional.of(client));
        when(accountRepository.findFirstByClient_Id(3038L)).thenReturn(Optional.empty());
        when(accountMapper.toEntity(dto)).thenReturn(incoming);
        when(accountRepository.save(incoming)).thenThrow(new DataIntegrityViolationException("duplicate key"));

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> accountService.syncAccountResult(dto));

        assertEquals("Le client Jean Dupont a déjà un compte.", ex.getMessage());
        verify(eventPublisher, never()).publishEvent(any());
    }

    private void stubLock() {
        when(entityManager.createNativeQuery(anyString())).thenReturn(lockQuery);
        when(lockQuery.setParameter(anyInt(), any())).thenReturn(lockQuery);
        when(lockQuery.getSingleResult()).thenReturn(1);
    }

    private static Account existingAccount(Long id, String number, double balance, Client client) {
        Account account = new Account();
        account.setId(id);
        account.setAccountNumber(number);
        account.setAccountBalance(balance);
        account.setStatus(AccountStatus.ACTIF);
        account.setState(State.ENABLED);
        account.setClient(client);
        return account;
    }

    private static Client activeClient(Long id, String firstname, String lastname) {
        Client client = clientWithStatus(ClientActivationStatus.ACTIVE);
        client.setId(id);
        client.setFirstname(firstname);
        client.setLastname(lastname);
        return client;
    }

    private static AccountDto accountDto(Long clientId) {
        AccountDto dto = new AccountDto();
        dto.setClientId(clientId);
        dto.setAccountNumber("1234567890");
        dto.setAccountBalance(1000);
        return dto;
    }

    private static Client clientWithStatus(ClientActivationStatus status) {
        Client client = new Client();
        client.setId(1L);
        client.setActivationStatus(status);
        return client;
    }
}
