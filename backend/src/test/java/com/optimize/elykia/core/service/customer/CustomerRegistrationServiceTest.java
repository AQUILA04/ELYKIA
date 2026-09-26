package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserAccount;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.security.jwt.JwtUtils;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.customer.CustomerLoginResponse;
import com.optimize.elykia.core.dto.customer.CustomerRegisterRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;

import java.time.LocalDate;
import java.util.Base64;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerRegistrationServiceTest {

    @Mock private CustomerOtpService customerOtpService;
    @Mock private ClientRepository clientRepository;
    @Mock private ClientService clientService;
    @Mock private CustomerUserProvisioningService provisioningService;
    @Mock private UserRepository userRepository;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtUtils jwtUtils;

    @InjectMocks
    private CustomerRegistrationService service;

    @Test
    void register_rejectsInvalidPhone() {
        CustomerRegisterRequest request = validRequest();
        request.setPhone("12");

        assertThrows(CustomValidationException.class, () -> service.register(request));
    }

    @Test
    void register_rejectsExistingPhone() {
        CustomerRegisterRequest request = validRequest();
        doNothing().when(customerOtpService).assertProofToken("90123456", "proof");
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456"))
                .thenReturn(Optional.of(mock(User.class)));

        assertThrows(CustomValidationException.class, () -> service.register(request));
    }

    @Test
    void register_rejectsExistingCardId() {
        CustomerRegisterRequest request = validRequest();
        doNothing().when(customerOtpService).assertProofToken("90123456", "proof");
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.empty());
        when(clientRepository.existsByPhone("90123456")).thenReturn(false);
        when(clientRepository.existsByCardID("CARD-1")).thenReturn(true);

        assertThrows(CustomValidationException.class, () -> service.register(request));
    }

    @Test
    void register_rejectsUnderage() {
        CustomerRegisterRequest request = validRequest();
        request.setDateOfBirth(LocalDate.now().minusYears(10));
        doNothing().when(customerOtpService).assertProofToken("90123456", "proof");
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.empty());
        when(clientRepository.existsByPhone("90123456")).thenReturn(false);
        when(clientRepository.existsByCardID("CARD-1")).thenReturn(false);

        assertThrows(CustomValidationException.class, () -> service.register(request));
    }

    @Test
    void register_rejectsShortPhoto() {
        CustomerRegisterRequest request = validRequest();
        request.setProfilPhoto("tiny");
        doNothing().when(customerOtpService).assertProofToken("90123456", "proof");
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.empty());
        when(clientRepository.existsByPhone("90123456")).thenReturn(false);
        when(clientRepository.existsByCardID("CARD-1")).thenReturn(false);

        assertThrows(CustomValidationException.class, () -> service.register(request));
    }

    @Test
    void register_createsPendingClientAndReturnsToken() {
        CustomerRegisterRequest request = validRequest();
        doNothing().when(customerOtpService).assertProofToken("90123456", "proof");
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(user("90123456")));
        when(clientRepository.existsByPhone("90123456")).thenReturn(false);
        when(clientRepository.existsByCardID("CARD-1")).thenReturn(false);
        when(clientRepository.saveAndFlush(any(Client.class))).thenAnswer(inv -> {
            Client c = inv.getArgument(0);
            c.setId(55L);
            return c;
        });
        when(clientRepository.findById(55L)).thenAnswer(inv -> {
            Client c = new Client();
            c.setId(55L);
            c.setFirstname("Ada");
            c.setLastname("Lovelace");
            c.setPhone("90123456");
            c.setActivationStatus(ClientActivationStatus.PENDING);
            return Optional.of(c);
        });
        Authentication auth = mock(Authentication.class);
        when(authenticationManager.authenticate(any())).thenReturn(auth);
        when(jwtUtils.generateJwtToken(auth)).thenReturn("jwt-token");

        CustomerLoginResponse response = service.register(request);

        assertEquals("jwt-token", response.getToken());
        assertEquals("55", response.getClientId());
        assertEquals("PENDING", response.getActivationStatus());
        verify(provisioningService).provisionSelfRegistered(any(Client.class), eq("1234"));
        verify(clientService).uploadClientPhotos(eq(55L), any(byte[].class), eq(null));
    }

    private static CustomerRegisterRequest validRequest() {
        CustomerRegisterRequest request = new CustomerRegisterRequest();
        request.setPhone("90123456");
        request.setOtpProofToken("proof");
        request.setFirstname("Ada");
        request.setLastname("Lovelace");
        request.setAddress("Lome");
        request.setQuarter("Tokoin");
        request.setDateOfBirth(LocalDate.of(1990, 1, 1));
        request.setOccupation("Commercante");
        request.setCardType("CENI");
        request.setCardID("CARD-1");
        request.setProfilPhoto(longBase64Photo());
        request.setPin("1234");
        return request;
    }

    private static User user(String username) {
        UserAccount account = new UserAccount();
        account.setUsername(username);
        account.setPinConfigured(true);
        return new User("Ada", "Lovelace", "F", "a@example.com", username, account);
    }

    private static String longBase64Photo() {
        byte[] bytes = new byte[800];
        for (int i = 0; i < bytes.length; i++) {
            bytes[i] = (byte) (i % 127);
        }
        return Base64.getEncoder().encodeToString(bytes);
    }
}
