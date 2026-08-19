package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.elykia.core.dto.LocalityDto;
import com.optimize.elykia.core.entity.Locality;
import com.optimize.elykia.core.mapper.LocalityMapper;
import com.optimize.elykia.core.repository.LocalityRepository;
import com.optimize.elykia.core.service.masterdata.LocalityService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocalityServiceTest {

    @Mock
    private LocalityRepository localityRepository;
    @Mock
    private LocalityMapper localityMapper;
    @InjectMocks
    private LocalityService localityService;

    @Test
    void createLocality_persistsNewUniqueName() {
        // Given
        LocalityDto dto = localityDto("Douala");
        Locality locality = locality(1L, "Douala");
        when(localityMapper.toEntity(dto)).thenReturn(locality);
        when(localityRepository.existsByName("Douala")).thenReturn(false);
        when(localityRepository.save(locality)).thenReturn(locality);

        // When
        Locality result = localityService.createLocality(dto);

        // Then
        assertSame(locality, result);
        verify(localityRepository).existsByName("Douala");
        verify(localityRepository).save(locality);
    }

    @Test
    void createLocality_rejectsDuplicateNameWithoutPersisting() {
        // Given
        LocalityDto dto = localityDto("Douala");
        when(localityMapper.toEntity(dto)).thenReturn(locality(null, "Douala"));
        when(localityRepository.existsByName("Douala")).thenReturn(true);

        // When / Then
        assertThrows(ApplicationException.class, () -> localityService.createLocality(dto));
        verify(localityRepository, never()).save(any());
    }

    @Test
    void updateLocality_assignsPathIdentifierAndFlushesMappedEntity() {
        // Given
        LocalityDto dto = localityDto("Yaoundé");
        Locality locality = locality(9L, "Yaoundé");
        when(localityMapper.toEntity(dto)).thenReturn(locality);
        when(localityRepository.saveAndFlush(locality)).thenReturn(locality);

        // When
        Locality result = localityService.updateLocality(dto, 9L);

        // Then
        assertSame(locality, result);
        assertEquals(9L, dto.getId());
        verify(localityRepository).saveAndFlush(locality);
    }

    @Test
    void elasticsearch_delegatesKeywordAndPaginationToRepository() {
        // Given
        Pageable pageable = PageRequest.of(1, 5);
        Page<Locality> expected = new PageImpl<>(List.of(locality(1L, "Douala")), pageable, 6);
        when(localityRepository.elasticsearch("dou", pageable)).thenReturn(expected);

        // When
        Page<Locality> result = localityService.elasticsearch("dou", pageable);

        // Then
        assertSame(expected, result);
        verify(localityRepository).elasticsearch("dou", pageable);
    }

    private LocalityDto localityDto(String name) {
        LocalityDto dto = new LocalityDto();
        dto.setName(name);
        return dto;
    }

    private Locality locality(Long id, String name) {
        Locality locality = new Locality();
        locality.setId(id);
        locality.setName(name);
        return locality;
    }
}
