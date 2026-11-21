package com.optimize.elykia.organization.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.organization.web.dto.CommercialStaffWriteDto;
import com.optimize.elykia.organization.domain.Promoter;
import com.optimize.elykia.organization.infrastructure.persistence.CommercialAccountAssignmentRepository;
import com.optimize.elykia.organization.infrastructure.persistence.PromoterRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialStaffServiceTest {

    @Mock
    private PromoterRepository promoterRepository;
    @Mock
    private CommercialAccountAssignmentRepository assignmentRepository;
    @Mock
    private CommercialStaffPhotoService photoService;

    private CommercialStaffService service;

    @BeforeEach
    void setUp() {
        service = new CommercialStaffService(promoterRepository, assignmentRepository, photoService);
    }

    @Test
    void createKeepsIdentityDocumentAndPhoneOptional() {
        when(promoterRepository.save(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> {
            Promoter saved = invocation.getArgument(0);
            saved.setId(5L);
            return saved;
        });

        var created = service.create(new CommercialStaffWriteDto("  Awa Koffi ", "  ", null, null));

        assertEquals("Awa Koffi", created.name());
        assertEquals("AK", created.initials());
        assertNull(created.phoneNumber());
        assertNull(created.serialNumber());
    }

    @Test
    void deleteIsRefusedWhenAssignmentsExist() {
        Promoter person = new Promoter();
        person.setId(5L);
        person.setName("Awa");
        person.setState(State.ENABLED);
        when(promoterRepository.findById(5L)).thenReturn(Optional.of(person));
        when(assignmentRepository.existsByPromoterIdAndState(5L, State.ENABLED)).thenReturn(true);

        assertThrows(CustomValidationException.class, () -> service.delete(5L));
        verify(photoService, never()).delete(5L);
    }
}
