package com.optimize.elykia.core.service.customer;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserAccount;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.core.dto.customer.CustomerPhoneRequest;
import com.optimize.elykia.core.dto.customer.CustomerCheckPhoneResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerAuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private CustomerContextService contextService;
    @Mock
    private CustomerOtpService customerOtpService;
    @Mock
    private ClientRepository clientRepository;
    @Mock
    private CustomerRegistrationService customerRegistrationService;

    @InjectMocks
    private CustomerAuthService customerAuthService;

    @Test
    void checkPhone_returnsCanRegisterWhenUnknown() {
        when(userRepository.findByUserAccount_usernameIgnoreCase("92181351")).thenReturn(Optional.empty());
        when(clientRepository.existsByPhone("92181351")).thenReturn(false);

        CustomerPhoneRequest request = new CustomerPhoneRequest();
        request.setPhone("92181351");
        CustomerCheckPhoneResponse response = customerAuthService.checkPhone(request);

        assertFalse(response.isExists());
        assertTrue(response.isCanRegister());
    }

    @Test
    void checkPhone_returnsFalseWhenUserExistsWithoutClient() {
        UserAccount account = new UserAccount();
        account.setUsername("92181351");
        account.setPinConfigured(Boolean.FALSE);
        User user = new User("Chris", "Example", "M", "c@example.com", "92181351", account);

        when(userRepository.findByUserAccount_usernameIgnoreCase("92181351")).thenReturn(Optional.of(user));
        when(contextService.findClientIdOptional("92181351")).thenReturn(Optional.empty());
        when(clientRepository.existsByPhone("92181351")).thenReturn(false);

        CustomerPhoneRequest request = new CustomerPhoneRequest();
        request.setPhone("92181351");
        CustomerCheckPhoneResponse response = customerAuthService.checkPhone(request);

        assertFalse(response.isExists());
        assertTrue(response.isCanRegister());
    }

    @Test
    void checkPhone_returnsTrueWhenUserAndClientExist() {
        UserAccount account = new UserAccount();
        account.setUsername("90123456");
        account.setPinConfigured(Boolean.TRUE);
        User user = new User("Jean", "Kouassi", "M", "j@example.com", "90123456", account);
        Client client = new Client();
        client.setId(42L);
        client.setActivationStatus(ClientActivationStatus.ACTIVE);

        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.of(user));
        when(contextService.findClientIdOptional("90123456")).thenReturn(Optional.of(42L));
        when(clientRepository.findById(42L)).thenReturn(Optional.of(client));

        CustomerPhoneRequest request = new CustomerPhoneRequest();
        request.setPhone("90123456");
        CustomerCheckPhoneResponse response = customerAuthService.checkPhone(request);

        assertTrue(response.isExists());
        assertTrue(response.isPinConfigured());
        assertFalse(response.isCanRegister());
    }
}
