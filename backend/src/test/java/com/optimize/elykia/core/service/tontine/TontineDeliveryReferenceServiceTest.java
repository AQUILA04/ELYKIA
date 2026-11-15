package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineDeliveryReferenceServiceTest {

    @Mock
    private TontineDeliveryRepository deliveryRepository;
    @InjectMocks
    private TontineDeliveryReferenceService service;

    @Test
    void resolveReference_returnsTrimmedProvidedReferenceWhenItIsAvailable() {
        // Given
        when(deliveryRepository.existsByReference("LIV-2026-01-MANUEL")).thenReturn(false);

        // When
        String result = service.resolveReference("  LIV-2026-01-MANUEL  ", LocalDateTime.of(2026, 1, 15, 10, 30));

        // Then
        assertEquals("LIV-2026-01-MANUEL", result);
        verify(deliveryRepository).existsByReference("LIV-2026-01-MANUEL");
    }

    @Test
    void resolveReference_rejectsProvidedReferenceAlreadyUsed() {
        // Given
        when(deliveryRepository.existsByReference("LIV-2026-01-DUP")).thenReturn(true);

        // When / Then
        assertThrows(CustomValidationException.class,
                () -> service.resolveReference("LIV-2026-01-DUP", LocalDateTime.of(2026, 1, 15, 10, 30)));
        verify(deliveryRepository).existsByReference("LIV-2026-01-DUP");
    }

    @Test
    void resolveReference_generatesMonthScopedReferenceWhenNoneIsProvided() {
        // Given
        when(deliveryRepository.existsByReference(anyString())).thenReturn(false);

        // When
        String result = service.resolveReference(null, LocalDateTime.of(2026, 3, 15, 10, 30));

        // Then
        assertTrue(result.matches("LIV-2026-03-[0-9A-F]{8}"));
        verify(deliveryRepository).existsByReference(result);
    }

    @Test
    void resolveAuthenticityCode_keepsAValidCodeSentByThePhone() {
        when(deliveryRepository.existsByAuthenticityCode("ELY-AB12-CD34")).thenReturn(false);

        String result = service.resolveAuthenticityCode(" ely-ab12-cd34 ");

        assertEquals("ELY-AB12-CD34", result);
    }

    @Test
    void resolveAuthenticityCode_rejectsAnUnknownShape() {
        assertThrows(CustomValidationException.class, () -> service.resolveAuthenticityCode("FAUX-123"));
    }

    @Test
    void resolveAuthenticityCode_generatesElyCodeWhenNoneIsProvided() {
        when(deliveryRepository.existsByAuthenticityCode(anyString())).thenReturn(false);

        String result = service.resolveAuthenticityCode(null);

        assertTrue(result.matches("ELY-[0-9A-F]{4}-[0-9A-F]{4}"));
    }

    @Test
    void generate_usesCurrentDateWhenRequestDateIsAbsent() {
        // Given
        int currentYear = LocalDateTime.now().getYear();

        // When
        String result = service.generate(null);

        // Then
        assertTrue(result.startsWith("LIV-" + currentYear + "-"));
        assertFalse(result.isBlank());
    }
}
