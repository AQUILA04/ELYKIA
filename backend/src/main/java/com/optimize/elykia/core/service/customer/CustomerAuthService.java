package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.security.jwt.JwtUtils;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.core.dto.customer.*;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpSendResponse;
import com.optimize.elykia.core.util.PhoneNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CustomerAuthService {

    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;
    private final CustomerContextService contextService;
    private final CustomerOtpService customerOtpService;
    private final ClientRepository clientRepository;
    private final CustomerRegistrationService customerRegistrationService;

    @Value("${bezkoder.app.jwtExpirationMs:86400000}")
    private long jwtExpirationMs;

    @Transactional(readOnly = true)
    public CustomerCheckPhoneResponse checkPhone(CustomerPhoneRequest request) {
        String username = PhoneNormalizer.toUsername(request.getPhone());
        Optional<User> userOpt = userRepository.findByUserAccount_usernameIgnoreCase(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            Optional<Long> clientId = contextService.findClientIdOptional(username);
            if (clientId.isPresent()) {
                Client client = clientRepository.findById(clientId.get()).orElse(null);
                String activation = client != null && client.getActivationStatus() != null
                        ? client.getActivationStatus().name()
                        : ClientActivationStatus.ACTIVE.name();
                return CustomerCheckPhoneResponse.builder()
                        .exists(true)
                        .canRegister(false)
                        .pinConfigured(Boolean.TRUE.equals(user.getUserAccount().getPinConfigured()))
                        .maskedName(maskName(user))
                        .activationStatus(activation)
                        .build();
            }
        }
        boolean phoneTakenByClient = clientRepository.existsByPhone(username);
        return CustomerCheckPhoneResponse.builder()
                .exists(false)
                .pinConfigured(false)
                .canRegister(!phoneTakenByClient)
                .build();
    }

    @Transactional
    public CustomerLoginResponse login(CustomerLoginRequest request) {
        String username = PhoneNormalizer.toUsername(request.getPhone());
        User user = userRepository.findByUserAccount_usernameIgnoreCase(username)
                .orElseThrow(() -> new ResourceNotFoundException("Compte introuvable pour ce numéro."));
        if (!Boolean.TRUE.equals(user.getUserAccount().getPinConfigured())) {
            throw new CustomValidationException("Veuillez configurer votre code PIN.");
        }
        Client client = contextService.requireClient(username);
        assertNotRejected(client);
        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, request.getPin()));
            return buildLoginResponse(user, auth, client);
        } catch (BadCredentialsException e) {
            throw new CustomValidationException("Code PIN incorrect.");
        }
    }

    @Transactional(readOnly = true)
    public CustomerOtpSendResponse sendOtp(CustomerPhoneRequest request) {
        String username = PhoneNormalizer.toUsername(request.getPhone());
        Optional<User> userOpt = userRepository.findByUserAccount_usernameIgnoreCase(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (Boolean.TRUE.equals(user.getUserAccount().getPinConfigured())) {
                throw new CustomValidationException("Le code PIN est déjà configuré. Connectez-vous avec votre PIN.");
            }
            if (contextService.findClientIdOptional(username).isEmpty()) {
                throw new ResourceNotFoundException(
                        "Aucun dossier client associé à ce numéro. Contactez votre agence.");
            }
        } else if (clientRepository.existsByPhone(username)) {
            throw new CustomValidationException(
                    "Ce numéro est déjà associé à un dossier. Contactez votre agence.");
        }
        // Inscription (pas de user) ou première activation (user sans PIN)
        OtpSendResponse hub = customerOtpService.sendOtp(username);
        return CustomerOtpSendResponse.builder()
                .sessionId(hub.sessionId())
                .expiresAt(hub.expiresAt())
                .channel(hub.channel() != null ? hub.channel() : "SMS")
                .build();
    }

    @Transactional(readOnly = true)
    public CustomerOtpVerifyResponse verifyOtp(CustomerOtpVerifyRequest request) {
        String username = PhoneNormalizer.toUsername(request.getPhone());
        Optional<User> userOpt = userRepository.findByUserAccount_usernameIgnoreCase(username);
        if (userOpt.isPresent()) {
            if (Boolean.TRUE.equals(userOpt.get().getUserAccount().getPinConfigured())) {
                throw new CustomValidationException("Le code PIN est déjà configuré.");
            }
        } else if (clientRepository.existsByPhone(username)) {
            throw new CustomValidationException(
                    "Ce numéro est déjà associé à un dossier. Contactez votre agence.");
        }
        String proof = customerOtpService.verifyOtp(username, request.getCode());
        return CustomerOtpVerifyResponse.builder()
                .verified(true)
                .otpProofToken(proof)
                .build();
    }

    @Transactional
    public CustomerLoginResponse setupPin(CustomerSetupPinRequest request) {
        String username = PhoneNormalizer.toUsername(request.getPhone());
        customerOtpService.assertProofToken(username, request.getOtpProofToken());
        User user = userRepository.findByUserAccount_usernameIgnoreCase(username)
                .orElseThrow(() -> new ResourceNotFoundException("Compte introuvable pour ce numéro."));
        if (Boolean.TRUE.equals(user.getUserAccount().getPinConfigured())) {
            throw new CustomValidationException("Le code PIN est déjà configuré.");
        }
        user.getUserAccount().setPassword(passwordEncoder.encode(request.getPin()));
        user.getUserAccount().setPinConfigured(Boolean.TRUE);
        userRepository.save(user);

        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, request.getPin()));
        try {
            Client client = contextService.requireClient(username);
            assertNotRejected(client);
            return buildLoginResponse(user, auth, client);
        } catch (ResourceNotFoundException e) {
            if ("client.not.found".equals(e.getMessage())) {
                throw new ResourceNotFoundException(
                        "Aucun dossier client associé à ce numéro. Contactez votre agence.");
            }
            throw e;
        }
    }

    @Transactional
    public CustomerLoginResponse register(CustomerRegisterRequest request) {
        return customerRegistrationService.register(request);
    }

    private CustomerLoginResponse buildLoginResponse(User user, Authentication auth, Client client) {
        String jwt = jwtUtils.generateJwtToken(auth);
        Instant expires = Instant.now().plus(jwtExpirationMs, ChronoUnit.MILLIS);
        ClientActivationStatus status = client.getActivationStatus() != null
                ? client.getActivationStatus()
                : ClientActivationStatus.ACTIVE;
        return CustomerLoginResponse.builder()
                .token(jwt)
                .clientId(String.valueOf(client.getId()))
                .fullName(client.getFullName())
                .phone(user.getUsername())
                .expiresAt(expires.toString())
                .activationStatus(status.name())
                .build();
    }

    private static void assertNotRejected(Client client) {
        if (client != null && client.isActivationRejected()) {
            String reason = client.getActivationRejectionReason();
            throw new CustomValidationException(
                    StringUtilsHasText(reason)
                            ? "Inscription refusée : " + reason + " Contactez votre agence."
                            : "Inscription refusée. Contactez votre agence.");
        }
    }

    private static boolean StringUtilsHasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String maskName(User user) {
        if (user.getFirstname() == null || user.getFirstname().length() < 2) {
            return "Client";
        }
        return user.getFirstname().charAt(0) + "*** " +
                (user.getLastname() != null && !user.getLastname().isEmpty()
                        ? user.getLastname().charAt(0) + "."
                        : "");
    }
}
