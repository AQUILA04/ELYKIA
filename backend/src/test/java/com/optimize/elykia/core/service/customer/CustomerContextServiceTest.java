package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.entity.customer.CustomerUserMapping;
import com.optimize.elykia.core.repository.customer.CustomerUserMappingRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerContextServiceTest {

    @Mock private CustomerUserMappingRepository mappingRepository;
    @Mock private ClientRepository clientRepository;
    @Mock private ClientService clientService;
    @Mock private UserRepository userRepository;
    @Mock private CustomerUserMapping mapping;
    @Mock private Client client;
    @Mock private User user;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void findClientIdOptional_prefersExplicitMappingBeforePhoneFallback() {
        // Given
        CustomerContextService service = service();
        when(mappingRepository.findByUsername("90011223")).thenReturn(Optional.of(mapping));
        when(mapping.getClientId()).thenReturn(45L);

        // When
        Optional<Long> clientId = service.findClientIdOptional("+228 90 01 12 23");

        // Then
        assertEquals(Optional.of(45L), clientId);
        verify(clientRepository, never()).findFirstByPhoneAndClientTypeAndState(any(), any(), any());
    }

    @Test
    void findClientIdOptional_fallsBackThroughNormalizedPhoneCandidatesUntilEnabledClientIsFound() {
        // Given
        CustomerContextService service = service();
        Client fallbackClient = new Client();
        fallbackClient.setId(51L);
        when(mappingRepository.findByUsername("90011223")).thenReturn(Optional.empty());
        when(clientRepository.findFirstByPhoneAndClientTypeAndState(
                "90011223", ClientType.CLIENT, com.optimize.common.entities.enums.State.ENABLED)).thenReturn(Optional.empty());
        when(clientRepository.findFirstByPhoneAndClientTypeAndState(
                "+22890011223", ClientType.CLIENT, com.optimize.common.entities.enums.State.ENABLED)).thenReturn(Optional.empty());
        when(clientRepository.findFirstByPhoneAndClientTypeAndState(
                "22890011223", ClientType.CLIENT, com.optimize.common.entities.enums.State.ENABLED))
                .thenReturn(Optional.of(fallbackClient));

        // When
        Optional<Long> clientId = service.findClientIdOptional("+228 90 01 12 23");

        // Then
        assertEquals(Optional.of(51L), clientId);
        verify(clientRepository, never()).findFirstByPhoneAndClientTypeAndState(
                "090011223", ClientType.CLIENT, com.optimize.common.entities.enums.State.ENABLED);
    }

    @Test
    void requireClient_rejectsMappedIdentityWhenItsClientTypeIsNotEndCustomer() {
        // Given
        CustomerContextService service = service();
        when(mappingRepository.findByUsername("90011223")).thenReturn(Optional.of(mapping));
        when(mapping.getClientId()).thenReturn(45L);
        when(clientService.getById(45L)).thenReturn(client);
        when(client.getClientType()).thenReturn(ClientType.PROMOTER);

        // When
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.requireClient("90011223"));

        // Then
        assertTrue(exception.getMessage().contains("clients finaux"));
    }

    @Test
    void currentUsername_resolvesCanonicalUserFromAuthenticatedPrincipal() {
        // Given
        CustomerContextService service = service();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("+22890011223", "ignored"));
        when(userRepository.findByUserAccount_usernameIgnoreCase("+22890011223")).thenReturn(Optional.of(user));
        when(user.getUsername()).thenReturn("90011223");

        // When
        String username = service.currentUsername();

        // Then
        assertEquals("90011223", username);
    }

    private CustomerContextService service() {
        return new CustomerContextService(mappingRepository, clientRepository, clientService, userRepository);
    }
}
