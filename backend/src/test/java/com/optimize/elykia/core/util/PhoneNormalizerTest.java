package com.optimize.elykia.core.util;

import com.optimize.common.entities.exception.CustomValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

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

    @ParameterizedTest
    @ValueSource(strings = {
            "90123456", "91123456", "92123456", "93123456",
            "96123456", "97123456", "98123456", "99123456",
            "70123456", "71123456", "78123456", "79123456",
            "+228 90 12 34 56", "22870123456", "090123456"
    })
    void isValidTogoMobile_acceptsTogoleseMobiles(String raw) {
        assertTrue(PhoneNormalizer.isValidTogoMobile(raw));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {
            "94123456", "95123456", "72123456", "80123456", "22123456",
            "9012345", "901234567", "12", "abc"
    })
    void isValidTogoMobile_rejectsOtherNumbers(String raw) {
        assertFalse(PhoneNormalizer.isValidTogoMobile(raw));
    }

    @Test
    void requireTogoMobile_returnsNormalizedUsername() {
        assertEquals("70123456", PhoneNormalizer.requireTogoMobile("+228 70 12 34 56"));
    }

    @Test
    void requireTogoMobile_throwsWithUserMessage() {
        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> PhoneNormalizer.requireTogoMobile("94123456"));
        assertEquals(PhoneNormalizer.INVALID_TOGO_PHONE_MESSAGE, ex.getMessage());
    }
}
