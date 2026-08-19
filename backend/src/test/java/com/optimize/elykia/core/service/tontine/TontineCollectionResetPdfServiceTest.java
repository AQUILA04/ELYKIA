package com.optimize.elykia.core.service.tontine;

import org.junit.jupiter.api.Test;
import org.thymeleaf.TemplateEngine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

class TontineCollectionResetPdfServiceTest {

    @Test
    void buildFileName_sanitizesCommercialAndQuarterWithoutChangingArchiveConvention() {
        // Given
        TontineCollectionResetPdfService service = new TontineCollectionResetPdfService(mock(TemplateEngine.class));

        // When
        String fileName = service.buildFileName(2026, "commercial / A", "T1 & spécial");

        // Then
        assertEquals("collectes-tontine-commercial___A-T1___sp_cial-2026.pdf", fileName);
    }

    @Test
    void buildStorageKey_usesStableYearRunCommercialAndQuarterHierarchy() {
        // Given
        TontineCollectionResetPdfService service = new TontineCollectionResetPdfService(mock(TemplateEngine.class));

        // When
        String storageKey = service.buildStorageKey(2026, 91L, "commercial.a", "T2");

        // Then
        assertEquals("tontine-collection-reset/2026/run-91/commercial_a/T2.pdf", storageKey);
    }

    @Test
    void archiveNames_replaceMissingCommercialOrQuarterWithExplicitPlaceholder() {
        // Given
        TontineCollectionResetPdfService service = new TontineCollectionResetPdfService(mock(TemplateEngine.class));

        // When
        String fileName = service.buildFileName(2026, " ", null);
        String storageKey = service.buildStorageKey(2026, 5L, null, "");

        // Then
        assertEquals("collectes-tontine-NA-NA-2026.pdf", fileName);
        assertEquals("tontine-collection-reset/2026/run-5/NA/NA.pdf", storageKey);
    }
}
