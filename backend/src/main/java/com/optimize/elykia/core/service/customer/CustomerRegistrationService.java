package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.util.Converter;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.security.jwt.JwtUtils;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.customer.CustomerLoginResponse;
import com.optimize.elykia.core.dto.customer.CustomerRegisterRequest;
import com.optimize.elykia.core.util.PhoneNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CustomerRegistrationService {

    private final CustomerOtpService customerOtpService;
    private final ClientRepository clientRepository;
    private final ClientService clientService;
    private final CustomerUserProvisioningService provisioningService;
    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;

    @Value("${bezkoder.app.jwtExpirationMs:86400000}")
    private long jwtExpirationMs;

    @Transactional
    public CustomerLoginResponse register(CustomerRegisterRequest request) {
        String username = PhoneNormalizer.toUsername(request.getPhone());
        if (!StringUtils.hasText(username) || username.length() < 8) {
            throw new CustomValidationException("Numéro de téléphone invalide.");
        }
        customerOtpService.assertProofToken(username, request.getOtpProofToken());

        if (userRepository.findByUserAccount_usernameIgnoreCase(username).isPresent()
                || clientRepository.existsByPhone(username)) {
            throw new CustomValidationException("Ce numéro est déjà enregistré. Connectez-vous.");
        }
        if (clientRepository.existsByCardID(request.getCardID().trim())) {
            throw new CustomValidationException("Ce numéro de pièce d'identité est déjà utilisé.");
        }
        validateIdentity(request);

        byte[] profilBytes = Converter.convertToByteImage(Objects.requireNonNull(request.getProfilPhoto()));
        if (profilBytes == null || profilBytes.length == 0) {
            throw new CustomValidationException("La photo de profil est obligatoire.");
        }

        Client client = new Client();
        client.setFirstname(request.getFirstname().trim());
        client.setLastname(request.getLastname().trim());
        client.setAddress(request.getAddress().trim());
        client.setQuarter(request.getQuarter().trim());
        client.setPhone(username);
        client.setDateOfBirth(request.getDateOfBirth());
        client.setOccupation(request.getOccupation().trim());
        client.setCardType(request.getCardType().trim());
        client.setCardID(request.getCardID().trim());
        client.setClientType(ClientType.CLIENT);
        client.setActivationStatus(ClientActivationStatus.PENDING);
        client.setCreditInProgress(false);
        client.setCreatedBy(username);
        client.setState(State.ENABLED);

        Client saved = clientRepository.saveAndFlush(client);
        clientService.uploadClientPhotos(saved.getId(), profilBytes, null);
        saved = clientRepository.findById(saved.getId()).orElse(saved);

        provisioningService.provisionSelfRegistered(saved, request.getPin());

        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, request.getPin()));
        User user = userRepository.findByUserAccount_usernameIgnoreCase(username)
                .orElseThrow(() -> new CustomValidationException("Compte introuvable après inscription."));
        return buildLoginResponse(user, auth, saved);
    }

    private void validateIdentity(CustomerRegisterRequest request) {
        if (request.getDateOfBirth().isAfter(LocalDate.now().minusYears(16))) {
            throw new CustomValidationException("La date de naissance n'est pas valide.");
        }
        if (!StringUtils.hasText(request.getPin()) || request.getPin().length() < 4) {
            throw new CustomValidationException("Le code PIN doit contenir 4 à 6 chiffres.");
        }
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
}
