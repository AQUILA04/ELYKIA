package com.optimize.elykia.recruitment.shared.util;

import org.springframework.util.StringUtils;

public final class RecruitmentPhoneNormalizer {

    private static final String COUNTRY_CODE = "228";

    private RecruitmentPhoneNormalizer() {
    }

    public static String normalize(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "";
        }
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.startsWith(COUNTRY_CODE) && digits.length() > COUNTRY_CODE.length()) {
            digits = digits.substring(COUNTRY_CODE.length());
        }
        while (digits.startsWith("0") && digits.length() > 1) {
            digits = digits.substring(1);
        }
        return digits;
    }
}
