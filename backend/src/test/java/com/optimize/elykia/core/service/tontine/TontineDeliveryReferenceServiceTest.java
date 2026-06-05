package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineDeliveryReferenceServiceTest {

    @Mock
    private TontineDeliveryRepository deliveryRepository;

    @InjectMocks
    private TontineDeliveryReferenceService service;

    @Test
    void generate_shouldFollowExpectedFormat() {
        String reference = service.generate(LocalDateTime.of(2026, 6, 5, 10, 0));
        assertTrue(reference.matches("LIV-2026-06-[0-9A-F]{8}"));
    }

    @Test
    void resolveReference_shouldUseProvidedReferenceWhenUnique() {
        when(deliveryRepository.existsByReference("LIV-2026-06-EB934TL0")).thenReturn(false);

        String reference = service.resolveReference("LIV-2026-06-EB934TL0", LocalDateTime.now());

        assertEquals("LIV-2026-06-EB934TL0", reference);
    }

    @Test
    void resolveReference_shouldRejectDuplicateProvidedReference() {
        when(deliveryRepository.existsByReference("LIV-2026-06-EB934TL0")).thenReturn(true);

        assertThrows(CustomValidationException.class,
                () -> service.resolveReference("LIV-2026-06-EB934TL0", LocalDateTime.now()));
    }

    @Test
    void resolveReference_shouldGenerateWhenMissing() {
        when(deliveryRepository.existsByReference(org.mockito.ArgumentMatchers.anyString())).thenReturn(false);

        String reference = service.resolveReference(null, LocalDateTime.of(2026, 6, 1, 0, 0));

        assertTrue(reference.startsWith("LIV-2026-06-"));
    }
}
