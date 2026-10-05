package com.optimize.elykia.core.service.ocr;

import com.optimize.elykia.core.config.PaymentProofProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extracts a Mobile Money transfer reference from OCR / PDF text using
 * ordered configurable regex patterns.
 */
@Component
@RequiredArgsConstructor
public class PaymentReferenceExtractor {

    private final PaymentProofProperties properties;
    private volatile List<Pattern> compiledPatterns;

    public String extract(String rawText) {
        if (!StringUtils.hasText(rawText)) {
            return null;
        }
        String normalized = rawText.replace('\u00A0', ' ').trim();
        for (Pattern pattern : patterns()) {
            Matcher matcher = pattern.matcher(normalized);
            if (matcher.find()) {
                String token = matcher.groupCount() >= 1 ? matcher.group(1) : matcher.group();
                if (StringUtils.hasText(token)) {
                    String cleaned = token.trim().replaceAll("\\s+", "");
                    if (cleaned.length() >= 6 && cleaned.length() <= 30 && cleaned.matches(".*\\d.*")) {
                        return cleaned;
                    }
                }
            }
        }
        return null;
    }

    private List<Pattern> patterns() {
        List<Pattern> cached = compiledPatterns;
        if (cached != null) {
            return cached;
        }
        synchronized (this) {
            if (compiledPatterns != null) {
                return compiledPatterns;
            }
            List<String> sources = properties.getOcr().getReferencePatterns();
            List<Pattern> built = new ArrayList<>();
            if (sources != null) {
                for (String source : sources) {
                    if (StringUtils.hasText(source)) {
                        built.add(Pattern.compile(source.trim()));
                    }
                }
            }
            compiledPatterns = List.copyOf(built);
            return compiledPatterns;
        }
    }
}
