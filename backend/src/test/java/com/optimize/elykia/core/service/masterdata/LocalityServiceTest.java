package com.optimize.elykia.core.service.masterdata;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.LocalityDto;
import com.optimize.elykia.core.entity.Locality;
import com.optimize.elykia.core.mapper.LocalityMapper;
import com.optimize.elykia.core.repository.LocalityRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocalityServiceTest {

    @Mock private LocalityRepository repository;
    @Mock private LocalityMapper localityMapper;

    @InjectMocks
    private LocalityService service;

    @Test
    void findOrCreateByName_reusesExistingIgnoringCase() {
        Locality existing = new Locality();
        existing.setId(4L);
        existing.setName("Agoè");
        when(repository.findFirstByNameIgnoreCaseAndStateNot("agoè", State.DELETED))
                .thenReturn(Optional.of(existing));

        Locality result = service.findOrCreateByName("  agoè  ");

        assertSame(existing, result);
        verify(repository, never()).save(any());
    }

    @Test
    void findOrCreateByName_createsWhenMissing() {
        when(repository.findFirstByNameIgnoreCaseAndStateNot("Kegue", State.DELETED))
                .thenReturn(Optional.empty());
        when(repository.existsByName("Kegue")).thenReturn(false);
        when(localityMapper.toEntity(any(LocalityDto.class))).thenAnswer(inv -> {
            LocalityDto dto = inv.getArgument(0);
            Locality locality = new Locality();
            locality.setName(dto.getName());
            return locality;
        });
        when(repository.save(any(Locality.class))).thenAnswer(inv -> inv.getArgument(0));

        Locality result = service.findOrCreateByName("Kegue");

        assertEquals("Kegue", result.getName());
    }

    @Test
    void findOrCreateByName_rejectsBlankAndSentinel() {
        assertThrows(CustomValidationException.class, () -> service.findOrCreateByName("   "));
        assertThrows(CustomValidationException.class, () -> service.findOrCreateByName("AUTRES (à préciser)"));
    }

    @Test
    void findOrCreateByName_linksWhenCreateRaces() {
        Locality existing = new Locality();
        existing.setName("Kegue");
        when(repository.findFirstByNameIgnoreCaseAndStateNot("Kegue", State.DELETED))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(existing));
        when(repository.existsByName("Kegue")).thenReturn(true);
        when(localityMapper.toEntity(any(LocalityDto.class))).thenReturn(new Locality());

        Locality result = service.findOrCreateByName("Kegue");

        assertSame(existing, result);
        verify(repository, never()).save(any());
    }

    @Test
    void findOrCreateByName_rethrowsWhenDuplicateCannotBeRelinked() {
        when(repository.findFirstByNameIgnoreCaseAndStateNot("Kegue", State.DELETED))
                .thenReturn(Optional.empty());
        when(repository.existsByName("Kegue")).thenReturn(true);
        when(localityMapper.toEntity(any(LocalityDto.class))).thenReturn(new Locality());

        assertThrows(ApplicationException.class, () -> service.findOrCreateByName("Kegue"));
    }
}
