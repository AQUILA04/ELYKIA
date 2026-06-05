package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
public class TontineDeliveryReferenceService {

    private static final SecureRandom RANDOM = new SecureRandom();

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
