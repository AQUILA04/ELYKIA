package com.optimize.elykia.core.util;

import com.optimize.common.securities.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.util.Locale;

@Component
@RequiredArgsConstructor
public class CustomerEmailGenerator {

    private static final String DOMAIN = "@amenouveve-yaveh.com";

    private final UserRepository userRepository;

    public String generate(String firstname, String lastname) {
        String base = slug(firstname) + "." + slug(lastname);
        String email = base + DOMAIN;
        int suffix = 2;
        while (userRepository.existsByEmail(email)) {
            email = base + suffix + DOMAIN;
            suffix++;
        }
        return email;
    }

    private static String slug(String value) {
        if (!StringUtils.hasText(value)) {
            return "client";
        }
        String normalized = Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
        return normalized.isEmpty() ? "client" : normalized;
    }
}
