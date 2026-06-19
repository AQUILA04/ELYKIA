package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.security.jwt.JwtUtils;
import com.optimize.common.securities.security.services.UserDetailsImpl;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.customer.*;
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

@Service
@RequiredArgsConstructor
public class CustomerAuthService {

    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;
    private final CustomerContextService contextService;
    private final FirebaseTokenVerifier firebaseTokenVerifier;

    @Value("${bezkoder.app.jwtExpirationMs:86400000}")
    private long jwtExpirationMs;

    @Transactional(readOnly = true)
    public CustomerCheckPhoneResponse checkPhone(CustomerPhoneRequest request) {
        String username = PhoneNormalizer.toUsername(request.getPhone());
        return userRepository.findByUserAccount_usernameIgnoreCase(username)
                .map(user -> CustomerCheckPhoneResponse.builder()
                        .exists(true)
                        .pinConfigured(Boolean.TRUE.equals(user.getUserAccount().getPinConfigured()))
                        .maskedName(maskName(user))
                        .build())
                .orElse(CustomerCheckPhoneResponse.builder()
                        .exists(false)
                        .pinConfigured(false)
                        .build());
    }

    @Transactional
    public CustomerLoginResponse login(CustomerLoginRequest request) {
        String username = PhoneNormalizer.toUsername(request.getPhone());
        User user = userRepository.findByUserAccount_usernameIgnoreCase(username)
                .orElseThrow(() -> new ResourceNotFoundException("Compte introuvable pour ce numéro."));
        if (!Boolean.TRUE.equals(user.getUserAccount().getPinConfigured())) {
            throw new CustomValidationException("Veuillez configurer votre code PIN.");
        }
        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, request.getPin()));
            return buildLoginResponse(user, auth);
        } catch (BadCredentialsException e) {
            throw new CustomValidationException("Code PIN incorrect.");
        }
    }

    @Transactional
    public CustomerLoginResponse setupPin(CustomerSetupPinRequest request) {
        String username = PhoneNormalizer.toUsername(request.getPhone());
        firebaseTokenVerifier.assertPhoneMatchesToken(username, request.getFirebaseIdToken());
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
        return buildLoginResponse(user, auth);
    }

    private CustomerLoginResponse buildLoginResponse(User user, Authentication auth) {
        String jwt = jwtUtils.generateJwtToken(auth);
        Client client = contextService.requireClient(user.getUsername());
        Instant expires = Instant.now().plus(jwtExpirationMs, ChronoUnit.MILLIS);
        return CustomerLoginResponse.builder()
                .token(jwt)
                .clientId(String.valueOf(client.getId()))
                .fullName(client.getFullName())
                .phone(user.getUsername())
                .expiresAt(expires.toString())
                .build();
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
