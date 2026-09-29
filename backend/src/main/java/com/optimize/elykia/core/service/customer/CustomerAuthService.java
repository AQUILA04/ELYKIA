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
import java.util.Map;
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
    private final CustomerActivityLogService activityLogService;

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
                activityLogService.recordServerEvent(
                        "AUTH", "CHECK_PHONE", username, clientId.get(),
                        "exists=true pinConfigured=" + Boolean.TRUE.equals(user.getUserAccount().getPinConfigured()),
                        Map.of("exists", true, "pinConfigured", Boolean.TRUE.equals(user.getUserAccount().getPinConfigured())));
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
        activityLogService.recordServerEvent(
                "AUTH", "CHECK_PHONE", username, null,
                "exists=false canRegister=" + !phoneTakenByClient,
                Map.of("exists", false, "canRegister", !phoneTakenByClient));
        return CustomerCheckPhoneResponse.builder()
                .exists(false)
                .pinConfigured(false)
                .canRegister(!phoneTakenByClient)
                .build();
    }

    @Transactional
    public CustomerLoginResponse login(CustomerLoginRequest request) {
        String username = PhoneNormalizer.toUsername(request.getPhone());
        try {
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
                CustomerLoginResponse response = buildLoginResponse(user, auth, client);
                activityLogService.recordServerEvent(
                        "AUTH", "LOGIN_SUCCESS", username, client.getId(),
                        "Connexion PIN réussie", Map.of("clientId", client.getId()));
                return response;
            } catch (BadCredentialsException e) {
                activityLogService.recordServerEvent(
                        "AUTH", "LOGIN_FAILED", username, client.getId(),
                        "Code PIN incorrect", Map.of("reason", "bad_credentials"));
                throw new CustomValidationException("Code PIN incorrect.");
            }
        } catch (ResourceNotFoundException | CustomValidationException e) {
            if (!(e instanceof CustomValidationException && "Code PIN incorrect.".equals(e.getMessage()))) {
                activityLogService.recordServerEvent(
                        "AUTH", "LOGIN_FAILED", username, null,
                        e.getMessage(), Map.of("reason", e.getClass().getSimpleName()));
            }
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public CustomerOtpSendResponse sendOtp(CustomerPhoneRequest request) {
        String username = PhoneNormalizer.toUsername(request.getPhone());
        try {
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
            Long clientId = contextService.findClientIdOptional(username).orElse(null);
            activityLogService.recordServerEvent(
                    "AUTH", "OTP_SENT", username, clientId,
                    "OTP envoyé", Map.of("channel", hub.channel() != null ? hub.channel() : "SMS"));
            return CustomerOtpSendResponse.builder()
                    .sessionId(hub.sessionId())
                    .expiresAt(hub.expiresAt())
                    .channel(hub.channel() != null ? hub.channel() : "SMS")
                    .build();
        } catch (RuntimeException e) {
            activityLogService.recordServerEvent(
                    "AUTH", "OTP_SEND_FAILED", username, null,
                    e.getMessage(), Map.of("reason", e.getClass().getSimpleName()));
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public CustomerOtpVerifyResponse verifyOtp(CustomerOtpVerifyRequest request) {
        String username = PhoneNormalizer.toUsername(request.getPhone());
        try {
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
            Long clientId = contextService.findClientIdOptional(username).orElse(null);
            activityLogService.recordServerEvent(
                    "AUTH", "OTP_VERIFIED", username, clientId,
                    "OTP vérifié", null);
            return CustomerOtpVerifyResponse.builder()
                    .verified(true)
                    .otpProofToken(proof)
                    .build();
        } catch (RuntimeException e) {
            activityLogService.recordServerEvent(
                    "AUTH", "OTP_FAILED", username, null,
                    e.getMessage(), Map.of("stage", "verify"));
            throw e;
        }
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
            CustomerLoginResponse response = buildLoginResponse(user, auth, client);
            activityLogService.recordServerEvent(
                    "AUTH", "PIN_SETUP", username, client.getId(),
                    "PIN configuré", null);
            return response;
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
        CustomerLoginResponse response = customerRegistrationService.register(request);
        String username = PhoneNormalizer.toUsername(request.getPhone());
        Long clientId = null;
        try {
            clientId = Long.parseLong(response.getClientId());
        } catch (Exception ignored) {
            // ignore
        }
        activityLogService.recordServerEvent(
                "AUTH", "REGISTER", username, clientId,
                "Inscription Espace Client", null);
        return response;
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
