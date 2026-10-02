package com.optimize.elykia.client.service;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.dto.AccountDto;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import com.optimize.elykia.client.mapper.AccountMapper;
import com.optimize.elykia.client.repository.AccountRepository;
import com.optimize.elykia.client.repository.ClientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
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

    private AccountService accountService;

    @BeforeEach
    void setUp() {
        accountService = new AccountService(accountRepository, accountMapper, eventPublisher, clientRepository);
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
