package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class TontineDeliveryReferenceService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Pattern AUTHENTICITY_CODE = Pattern.compile("ELY-[0-9A-F]{4}-[0-9A-F]{4}");

    private final TontineDeliveryRepository deliveryRepository;

    public TontineDeliveryReferenceService(TontineDeliveryRepository deliveryRepository) {
        this.deliveryRepository = deliveryRepository;
    }

    public String resolveReference(String providedReference, LocalDateTime requestDate) {
        if (StringUtils.hasText(providedReference)) {
            String ref = providedReference.trim();
            if (deliveryRepository.existsByReference(ref)) {
                throw new CustomValidationException("Référence de livraison déjà utilisée : " + ref);
            }
            return ref;
        }

        String reference;
        do {
            reference = generate(requestDate);
        } while (deliveryRepository.existsByReference(reference));
        return reference;
    }

    public String generate(LocalDateTime requestDate) {
        LocalDateTime dateTime = requestDate != null ? requestDate : LocalDateTime.now();
        return String.format("LIV-%d-%02d-%s", dateTime.getYear(), dateTime.getMonthValue(), randomHex8());
    }

    /**
     * Conserve le code envoyé par le téléphone, ou en tire un nouveau.
     * Le code identifie le reçu : il ne change pas quand les articles sont modifiés.
     */
    public String resolveAuthenticityCode(String provided) {
        if (StringUtils.hasText(provided)) {
            String code = provided.trim().toUpperCase(Locale.ROOT).replace(" ", "");
            if (!AUTHENTICITY_CODE.matcher(code).matches()) {
                throw new CustomValidationException("Code d'authenticité invalide.");
            }
            if (deliveryRepository.existsByAuthenticityCode(code)) {
                throw new CustomValidationException("Code d'authenticité déjà utilisé.");
            }
            return code;
        }

        String code;
        do {
            code = generateAuthenticityCode();
        } while (deliveryRepository.existsByAuthenticityCode(code));
        return code;
    }

    public static String generateAuthenticityCode() {
        byte[] bytes = new byte[4];
        RANDOM.nextBytes(bytes);
        StringBuilder hex = new StringBuilder(8);
        for (byte value : bytes) {
            hex.append(String.format("%02X", value & 0xFF));
        }
        return "ELY-" + hex.substring(0, 4) + "-" + hex.substring(4);
    }

    private String randomHex8() {
        byte[] bytes = new byte[4];
        RANDOM.nextBytes(bytes);
        StringBuilder builder = new StringBuilder(8);
        for (byte value : bytes) {
            builder.append(String.format("%02X", value & 0xFF));
        }
        return builder.toString();
    }
}
