package com.optimize.elykia.core.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "elykia.payment-proof")
public class PaymentProofProperties {

    /** When true, declaration endpoints reject submissions without paymentProofId. */
    private boolean required = false;

    private long maxBytes = 5L * 1024 * 1024;

    private int unlinkedRetentionHours = 24;

    private Ocr ocr = new Ocr();

    @Getter
    @Setter
    public static class Ocr {
        private String tesseractBinary = "tesseract";
        private String languages = "fra+eng";
        private int timeoutSeconds = 20;
        private int maxConcurrent = 2;
        private int minWidthPx = 1000;
        /** Ordered regex patterns with a single capturing group for the reference token. */
        private List<String> referencePatterns = new ArrayList<>(List.of(
                "(?i)(?:r[eé]f(?:[eé]rence)?|txn|transaction|id|n[°o]|numero|num[eé]ro)\\s*[:.#\\-]?\\s*([A-Z0-9][A-Z0-9\\-]{5,29})",
                "(?i)\\b([A-Z]{2,5}[-_]\\d{6,}[-_]?[A-Z0-9]*)\\b",
                "(?i)\\b(\\d{10,20})\\b"
        ));
    }
}
