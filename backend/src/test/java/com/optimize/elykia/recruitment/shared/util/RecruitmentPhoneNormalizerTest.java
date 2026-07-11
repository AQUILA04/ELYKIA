package com.optimize.elykia.recruitment.shared.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RecruitmentPhoneNormalizerTest {

    @Test
    void normalizesTogoPhone() {
        assertEquals("90123456", RecruitmentPhoneNormalizer.normalize("+22890123456"));
        assertEquals("90123456", RecruitmentPhoneNormalizer.normalize("090123456"));
    }
}
