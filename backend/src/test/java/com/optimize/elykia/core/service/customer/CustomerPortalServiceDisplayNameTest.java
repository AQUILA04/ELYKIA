package com.optimize.elykia.core.service.customer;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CustomerPortalServiceDisplayNameTest {

    @Test
    void buildArticleDisplayName_concatenatesCommercialNameAndName() throws Exception {
        Method method = CustomerPortalService.class.getDeclaredMethod(
                "buildArticleDisplayName", String.class, String.class);
        method.setAccessible(true);
        String display = (String) method.invoke(
                null,
                "HUILE: Aromate Aromate 1L 1L",
                "Huile aromatisée");
        assertEquals("HUILE: Aromate Aromate 1L 1L Huile aromatisée", display);
    }

    @Test
    void buildArticleDisplayName_avoidsDuplicateWhenNamesMatch() throws Exception {
        Method method = CustomerPortalService.class.getDeclaredMethod(
                "buildArticleDisplayName", String.class, String.class);
        method.setAccessible(true);
        String display = (String) method.invoke(null, "RIZ: Bonita 1Kg", "RIZ: Bonita 1Kg");
        assertEquals("RIZ: Bonita 1Kg", display);
    }
}
