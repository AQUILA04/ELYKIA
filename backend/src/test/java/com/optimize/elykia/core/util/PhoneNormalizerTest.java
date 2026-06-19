package com.optimize.elykia.core.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PhoneNormalizerTest {

    @Test
    void toUsername_stripsCountryCodeAndFormatting() {
        assertEquals("90123456", PhoneNormalizer.toUsername("+22890123456"));
        assertEquals("90123456", PhoneNormalizer.toUsername("22890123456"));
        assertEquals("90123456", PhoneNormalizer.toUsername("90 12 34 56"));
    }

    @Test
    void toE164_addsCountryCode() {
        assertEquals("+22890123456", PhoneNormalizer.toE164("90123456"));
    }

    @Test
    void matches_comparesNormalized() {
        assertTrue(PhoneNormalizer.matches("+22890123456", "90123456"));
    }
}
