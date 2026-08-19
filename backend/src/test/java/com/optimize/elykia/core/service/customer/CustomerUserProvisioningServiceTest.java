package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserAccount;
import com.optimize.common.securities.models.UserProfil;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.security.services.UserAccountService;
import com.optimize.common.securities.security.services.UserProfilService;
import com.optimize.common.securities.util.ProfilConstant;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.core.entity.customer.CustomerUserMapping;
import com.optimize.elykia.core.repository.customer.CustomerUserMappingRepository;
import com.optimize.elykia.core.util.CustomerEmailGenerator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerUserProvisioningServiceTest {

    @Mock private ClientRepository clientRepository;
    @Mock private CustomerUserMappingRepository mappingRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserAccountService userAccountService;
    @Mock private UserProfilService userProfilService;
    @Mock private CustomerEmailGenerator emailGenerator;
    @Mock private Client client;
    @Mock private UserProfil customerProfile;

    @Test
    void provisionIfAbsent_createsEnabledAccountUserAndMappingForEligibleUniqueCustomer() {
        // Given
        CustomerUserProvisioningService service = service();
        when(client.getClientType()).thenReturn(ClientType.CLIENT);
        when(client.getState()).thenReturn(State.ENABLED);
        when(client.getId()).thenReturn(44L);
        when(client.getPhone()).thenReturn("+228 90 01 12 23");
        when(client.getFirstname()).thenReturn("Alice");
        when(client.getLastname()).thenReturn("Test");
        when(mappingRepository.existsByClientId(44L)).thenReturn(false);
        when(mappingRepository.existsByUsername("90011223")).thenReturn(false);
        when(userAccountService.existsByUsername("90011223")).thenReturn(false);
        when(userProfilService.getByName(ProfilConstant.CLIENT_PROFIL)).thenReturn(customerProfile);
        when(emailGenerator.generate("Alice", "Test")).thenReturn("alice.test@customer.elykia.local");
        when(userAccountService.create(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mappingRepository.save(any(CustomerUserMapping.class))).thenAnswer(invocation -> invocation.getArgument(0));
        ArgumentCaptor<UserAccount> accountCaptor = ArgumentCaptor.forClass(UserAccount.class);
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        ArgumentCaptor<CustomerUserMapping> mappingCaptor = ArgumentCaptor.forClass(CustomerUserMapping.class);

        // When
        boolean created = service.provisionIfAbsent(client);

        // Then
        assertTrue(created);
        verify(userAccountService).create(accountCaptor.capture());
        UserAccount account = accountCaptor.getValue();
        assertEquals("90011223", account.getUsername());
        assertSame(customerProfile, account.getUserProfil());
        assertEquals(Boolean.TRUE, account.getActive());
        assertEquals(Boolean.FALSE, account.getPinConfigured());
        assertEquals(State.ENABLED, account.getState());
        assertEquals("System", account.getCreatedBy());
        verify(userRepository).save(userCaptor.capture());
        User user = userCaptor.getValue();
        assertEquals("Alice", user.getFirstname());
        assertEquals("Test", user.getLastname());
        assertEquals("90011223", user.getPhone());
        assertSame(account, user.getUserAccount());
        assertEquals(State.ENABLED, user.getState());
        verify(mappingRepository).save(mappingCaptor.capture());
        CustomerUserMapping mapping = mappingCaptor.getValue();
        assertEquals(44L, mapping.getClientId());
        assertEquals("90011223", mapping.getUsername());
        assertEquals(State.ENABLED, mapping.getState());
    }

    @Test
    void provisionIfAbsent_skipsIneligibleClientBeforeQueryingOrCreatingAnyIdentity() {
        // Given
        CustomerUserProvisioningService service = service();
        when(client.getClientType()).thenReturn(ClientType.PROMOTER);

        // When
        boolean created = service.provisionIfAbsent(client);

        // Then
        assertFalse(created);
        verify(mappingRepository, never()).existsByClientId(any());
        verify(userAccountService, never()).create(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void provisionIfAbsent_skipsCustomerWhenNormalizedPhoneAlreadyBelongsToAnotherMapping() {
        // Given
        CustomerUserProvisioningService service = service();
        when(client.getClientType()).thenReturn(ClientType.CLIENT);
        when(client.getState()).thenReturn(State.ENABLED);
        when(client.getId()).thenReturn(44L);
        when(client.getPhone()).thenReturn("+228 90 01 12 23");
        when(mappingRepository.existsByClientId(44L)).thenReturn(false);
        when(mappingRepository.existsByUsername("90011223")).thenReturn(true);

        // When
        boolean created = service.provisionIfAbsent(client);

        // Then
        assertFalse(created);
        verify(userAccountService, never()).create(any());
        verify(userRepository, never()).save(any());
        verify(mappingRepository, never()).save(any());
    }

    @Test
    void syncPhoneChange_updatesMappingAndExistingUserAccountWhenNewPhoneIsAvailable() {
        // Given
        CustomerUserProvisioningService service = service();
        CustomerUserMapping mapping = new CustomerUserMapping();
        mapping.setClientId(44L);
        mapping.setUsername("90011223");
        UserAccount account = new UserAccount();
        account.setUsername("90011223");
        User user = new User();
        user.setUserAccount(account);
        user.setPhone("90011223");
        when(mappingRepository.existsByUsername("90112233")).thenReturn(false);
        when(mappingRepository.findByClientId(44L)).thenReturn(Optional.of(mapping));
        when(userRepository.findByUserAccount_username("90011223")).thenReturn(Optional.of(user));
        when(mappingRepository.save(mapping)).thenReturn(mapping);
        when(userRepository.save(user)).thenReturn(user);

        // When
        service.syncPhoneChange(44L, "+228 90 01 12 23", "+228 90 11 22 33");

        // Then
        assertEquals("90112233", mapping.getUsername());
        assertEquals("90112233", user.getUserAccount().getUsername());
        assertEquals("90112233", user.getPhone());
        verify(mappingRepository).save(mapping);
        verify(userRepository).save(user);
    }

    @Test
    void syncPhoneChange_rejectsPhoneAlreadyMappedToAnotherCustomerBeforeLoadingIdentity() {
        // Given
        CustomerUserProvisioningService service = service();
        when(mappingRepository.existsByUsername("90112233")).thenReturn(true);

        // When
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.syncPhoneChange(44L, "90011223", "90112233"));

        // Then
        assertTrue(exception.getMessage().contains("déjà utilisé"));
        verify(mappingRepository, never()).findByClientId(any());
        verify(userRepository, never()).findByUserAccount_username(any());
    }

    private CustomerUserProvisioningService service() {
        return new CustomerUserProvisioningService(clientRepository, mappingRepository, userRepository,
                userAccountService, userProfilService, emailGenerator);
    }
}
