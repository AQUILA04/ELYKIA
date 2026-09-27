package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserAccount;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.security.jwt.JwtUtils;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.core.dto.customer.CustomerCheckPhoneResponse;
import com.optimize.elykia.core.dto.customer.CustomerLoginRequest;
import com.optimize.elykia.core.dto.customer.CustomerLoginResponse;
import com.optimize.elykia.core.dto.customer.CustomerOtpSendResponse;
import com.optimize.elykia.core.dto.customer.CustomerOtpVerifyRequest;
import com.optimize.elykia.core.dto.customer.CustomerOtpVerifyResponse;
import com.optimize.elykia.core.dto.customer.CustomerPhoneRequest;
import com.optimize.elykia.core.dto.customer.CustomerRegisterRequest;
import com.optimize.elykia.core.dto.customer.CustomerSetupPinRequest;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpSendResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerAuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtUtils jwtUtils;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private CustomerContextService contextService;
    @Mock private CustomerOtpService customerOtpService;
    @Mock private ClientRepository clientRepository;
    @Mock private CustomerRegistrationService customerRegistrationService;

    @InjectMocks
    private CustomerAuthService customerAuthService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(customerAuthService, "jwtExpirationMs", 86_400_000L);
    }

    @Test
    void checkPhone_returnsCanRegisterWhenUnknown() {
        when(userRepository.findByUserAccount_usernameIgnoreCase("92181351")).thenReturn(Optional.empty());
        when(clientRepository.existsByPhone("92181351")).thenReturn(false);

        CustomerCheckPhoneResponse response = customerAuthService.checkPhone(phone("92181351"));

        assertFalse(response.isExists());
        assertTrue(response.isCanRegister());
    }

    @Test
    void checkPhone_cannotRegisterWhenPhoneTakenByClientOnly() {
        when(userRepository.findByUserAccount_usernameIgnoreCase("92181351")).thenReturn(Optional.empty());
        when(clientRepository.existsByPhone("92181351")).thenReturn(true);

        CustomerCheckPhoneResponse response = customerAuthService.checkPhone(phone("92181351"));

        assertFalse(response.isExists());
        assertFalse(response.isCanRegister());
    }

    @Test
    void checkPhone_returnsFalseWhenUserExistsWithoutClient() {
        User user = user("92181351", false);

        when(userRepository.findByUserAccount_usernameIgnoreCase("92181351")).thenReturn(Optional.of(user));
        when(contextService.findClientIdOptional("92181351")).thenReturn(Optional.empty());
        when(clientRepository.existsByPhone("92181351")).thenReturn(false);

        CustomerCheckPhoneResponse response = customerAuthService.checkPhone(phone("92181351"));

        assertFalse(response.isExists());
        assertTrue(response.isCanRegister());
    }

    @Test
    void checkPhone_returnsTrueWhenUserAndClientExist() {
        User user = user("90123456", true);
        Client client = client(42L, ClientActivationStatus.ACTIVE);

        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.of(user));
        when(contextService.findClientIdOptional("90123456")).thenReturn(Optional.of(42L));
        when(clientRepository.findById(42L)).thenReturn(Optional.of(client));

        CustomerCheckPhoneResponse response = customerAuthService.checkPhone(phone("90123456"));

        assertTrue(response.isExists());
        assertTrue(response.isPinConfigured());
        assertFalse(response.isCanRegister());
        assertEquals("ACTIVE", response.getActivationStatus());
        assertTrue(response.getMaskedName().startsWith("J"));
    }

    @Test
    void checkPhone_defaultsActivationWhenClientStatusNull() {
        User user = user("90123456", true);
        Client client = client(42L, null);

        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.of(user));
        when(contextService.findClientIdOptional("90123456")).thenReturn(Optional.of(42L));
        when(clientRepository.findById(42L)).thenReturn(Optional.of(client));

        CustomerCheckPhoneResponse response = customerAuthService.checkPhone(phone("90123456"));

        assertEquals("ACTIVE", response.getActivationStatus());
    }

    @Test
    void sendOtp_allowsRegistrationWhenUnknown() {
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.empty());
        when(clientRepository.existsByPhone("90123456")).thenReturn(false);
        UUID sessionId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        when(customerOtpService.sendOtp("90123456"))
                .thenReturn(new OtpSendResponse(sessionId, Instant.parse("2030-01-01T00:00:00Z"),
                        null, "SMS", null, null));

        CustomerOtpSendResponse response = customerAuthService.sendOtp(phone("90123456"));

        assertEquals(sessionId, response.getSessionId());
        assertEquals("SMS", response.getChannel());
    }

    @Test
    void sendOtp_allowsFirstActivationWhenPinNotConfigured() {
        User user = user("90123456", false);
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.of(user));
        when(contextService.findClientIdOptional("90123456")).thenReturn(Optional.of(7L));
        UUID sessionId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        when(customerOtpService.sendOtp("90123456"))
                .thenReturn(new OtpSendResponse(sessionId, Instant.parse("2030-01-01T00:00:00Z"),
                        null, null, null, null));

        CustomerOtpSendResponse response = customerAuthService.sendOtp(phone("90123456"));

        assertEquals(sessionId, response.getSessionId());
        assertEquals("SMS", response.getChannel());
    }

    @Test
    void sendOtp_rejectsWhenPinAlreadyConfigured() {
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456"))
                .thenReturn(Optional.of(user("90123456", true)));

        assertThrows(CustomValidationException.class, () -> customerAuthService.sendOtp(phone("90123456")));
    }

    @Test
    void sendOtp_rejectsUserWithoutClient() {
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456"))
                .thenReturn(Optional.of(user("90123456", false)));
        when(contextService.findClientIdOptional("90123456")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> customerAuthService.sendOtp(phone("90123456")));
    }

    @Test
    void sendOtp_rejectsPhoneTakenByClientWithoutUser() {
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.empty());
        when(clientRepository.existsByPhone("90123456")).thenReturn(true);

        assertThrows(CustomValidationException.class, () -> customerAuthService.sendOtp(phone("90123456")));
    }

    @Test
    void verifyOtp_returnsProofForRegistration() {
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.empty());
        when(clientRepository.existsByPhone("90123456")).thenReturn(false);
        when(customerOtpService.verifyOtp("90123456", "123456")).thenReturn("proof-token");

        CustomerOtpVerifyRequest request = new CustomerOtpVerifyRequest();
        request.setPhone("90123456");
        request.setCode("123456");
        CustomerOtpVerifyResponse response = customerAuthService.verifyOtp(request);

        assertTrue(response.isVerified());
        assertEquals("proof-token", response.getOtpProofToken());
    }

    @Test
    void verifyOtp_rejectsWhenPinConfigured() {
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456"))
                .thenReturn(Optional.of(user("90123456", true)));

        CustomerOtpVerifyRequest request = new CustomerOtpVerifyRequest();
        request.setPhone("90123456");
        request.setCode("123456");

        assertThrows(CustomValidationException.class, () -> customerAuthService.verifyOtp(request));
    }

    @Test
    void verifyOtp_rejectsPhoneTakenByClientWithoutUser() {
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.empty());
        when(clientRepository.existsByPhone("90123456")).thenReturn(true);

        CustomerOtpVerifyRequest request = new CustomerOtpVerifyRequest();
        request.setPhone("90123456");
        request.setCode("123456");

        assertThrows(CustomValidationException.class, () -> customerAuthService.verifyOtp(request));
    }

    @Test
    void login_returnsTokenForActiveClient() {
        User user = user("90123456", true);
        Client client = client(42L, ClientActivationStatus.ACTIVE);
        Authentication auth = mock(Authentication.class);

        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.of(user));
        when(contextService.requireClient("90123456")).thenReturn(client);
        when(authenticationManager.authenticate(any())).thenReturn(auth);
        when(jwtUtils.generateJwtToken(auth)).thenReturn("jwt");

        CustomerLoginRequest request = new CustomerLoginRequest();
        request.setPhone("90123456");
        request.setPin("1234");
        CustomerLoginResponse response = customerAuthService.login(request);

        assertEquals("jwt", response.getToken());
        assertEquals("42", response.getClientId());
        assertEquals("ACTIVE", response.getActivationStatus());
    }

    @Test
    void login_rejectsWhenPinNotConfigured() {
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456"))
                .thenReturn(Optional.of(user("90123456", false)));

        CustomerLoginRequest request = new CustomerLoginRequest();
        request.setPhone("90123456");
        request.setPin("1234");

        assertThrows(CustomValidationException.class, () -> customerAuthService.login(request));
    }

    @Test
    void login_rejectsRejectedClient() {
        User user = user("90123456", true);
        Client client = client(42L, ClientActivationStatus.REJECTED);
        client.setActivationRejectionReason("Dossier incomplet");

        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.of(user));
        when(contextService.requireClient("90123456")).thenReturn(client);

        CustomerLoginRequest request = new CustomerLoginRequest();
        request.setPhone("90123456");
        request.setPin("1234");

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> customerAuthService.login(request));
        assertTrue(ex.getMessage().contains("Dossier incomplet"));
    }

    @Test
    void login_mapsBadCredentials() {
        User user = user("90123456", true);
        Client client = client(42L, ClientActivationStatus.PENDING);

        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.of(user));
        when(contextService.requireClient("90123456")).thenReturn(client);
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));

        CustomerLoginRequest request = new CustomerLoginRequest();
        request.setPhone("90123456");
        request.setPin("9999");

        assertThrows(CustomValidationException.class, () -> customerAuthService.login(request));
    }

    @Test
    void setupPin_configuresPinAndReturnsToken() {
        User user = user("90123456", false);
        Client client = client(42L, ClientActivationStatus.PENDING);
        Authentication auth = mock(Authentication.class);

        doNothing().when(customerOtpService).assertProofToken("90123456", "proof");
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("1234")).thenReturn("encoded");
        when(userRepository.save(user)).thenReturn(user);
        when(authenticationManager.authenticate(any())).thenReturn(auth);
        when(contextService.requireClient("90123456")).thenReturn(client);
        when(jwtUtils.generateJwtToken(auth)).thenReturn("jwt");

        CustomerSetupPinRequest request = new CustomerSetupPinRequest();
        request.setPhone("90123456");
        request.setOtpProofToken("proof");
        request.setPin("1234");
        CustomerLoginResponse response = customerAuthService.setupPin(request);

        assertEquals("jwt", response.getToken());
        assertTrue(user.getUserAccount().getPinConfigured());
        verify(passwordEncoder).encode("1234");
    }

    @Test
    void setupPin_rejectsWhenAlreadyConfigured() {
        doNothing().when(customerOtpService).assertProofToken("90123456", "proof");
        when(userRepository.findByUserAccount_usernameIgnoreCase("90123456"))
                .thenReturn(Optional.of(user("90123456", true)));

        CustomerSetupPinRequest request = new CustomerSetupPinRequest();
        request.setPhone("90123456");
        request.setOtpProofToken("proof");
        request.setPin("1234");

        assertThrows(CustomValidationException.class, () -> customerAuthService.setupPin(request));
    }

    @Test
    void register_delegatesToRegistrationService() {
        CustomerRegisterRequest request = new CustomerRegisterRequest();
        CustomerLoginResponse expected = CustomerLoginResponse.builder().token("t").build();
        when(customerRegistrationService.register(request)).thenReturn(expected);

        assertEquals(expected, customerAuthService.register(request));
        verify(customerRegistrationService).register(eq(request));
    }

    private static CustomerPhoneRequest phone(String value) {
        CustomerPhoneRequest request = new CustomerPhoneRequest();
        request.setPhone(value);
        return request;
    }

    private static User user(String username, boolean pinConfigured) {
        UserAccount account = new UserAccount();
        account.setUsername(username);
        account.setPinConfigured(pinConfigured);
        return new User("Jean", "Kouassi", "M", "j@example.com", username, account);
    }

    private static Client client(Long id, ClientActivationStatus status) {
        Client client = new Client();
        client.setId(id);
        client.setFirstname("Jean");
        client.setLastname("Kouassi");
        client.setPhone(String.valueOf(id));
        client.setActivationStatus(status);
        return client;
    }
}
