package com.optimize.elykia.core.service.customer;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.config.CustomerFirebaseProperties;
import com.optimize.elykia.core.util.PhoneNormalizer;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.FileInputStream;
import java.io.IOException;

@Service
@RequiredArgsConstructor
@Slf4j
public class FirebaseTokenVerifier {

    private final CustomerFirebaseProperties properties;

    @PostConstruct
    void init() {
        if (!properties.isEnabled() || !StringUtils.hasText(properties.getCredentialsPath())) {
            log.warn("Firebase Phone Auth désactivé ou credentials non configurés (app.customer.auth.firebase)");
            return;
        }
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }
        try (FileInputStream stream = new FileInputStream(properties.getCredentialsPath())) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(stream))
                    .build();
            FirebaseApp.initializeApp(options);
            log.info("Firebase Admin initialisé pour l'espace client");
        } catch (IOException e) {
            log.error("Impossible d'initialiser Firebase Admin", e);
        }
    }

    public String verifyPhoneToken(String firebaseIdToken) {
        if (!properties.isEnabled()) {
            throw new CustomValidationException("La vérification Firebase n'est pas activée sur ce serveur.");
        }
        if (!StringUtils.hasText(firebaseIdToken)) {
            throw new CustomValidationException("Token Firebase manquant.");
        }
        try {
            FirebaseToken token = FirebaseAuth.getInstance().verifyIdToken(firebaseIdToken);
            Object phoneNumber = token.getClaims().get("phone_number");
            if (phoneNumber == null) {
                throw new CustomValidationException("Le token Firebase ne contient pas de numéro de téléphone.");
            }
            return PhoneNormalizer.toUsername(phoneNumber.toString());
        } catch (FirebaseAuthException e) {
            throw new CustomValidationException("Token Firebase invalide : " + e.getMessage());
        }
    }

    public void assertPhoneMatchesToken(String expectedLocalPhone, String firebaseIdToken) {
        String tokenPhone = verifyPhoneToken(firebaseIdToken);
        if (!PhoneNormalizer.matches(expectedLocalPhone, tokenPhone)) {
            throw new CustomValidationException("Le numéro vérifié ne correspond pas au téléphone saisi.");
        }
    }
}
