package com.optimize.elykia.organization.application;

import com.optimize.elykia.organization.web.dto.PromoterDto;
import com.optimize.elykia.organization.domain.Promoter;
import com.optimize.elykia.organization.web.mapper.PromoterMapper;
import com.optimize.elykia.organization.infrastructure.persistence.PromoterRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromoterServiceTest {

    @Mock
    private PromoterRepository promoterRepository;
    @Mock
    private PromoterMapper promoterMapper;
    @InjectMocks
    private PromoterService service;

    @Test
    void createPromoter_mapsDtoThenPersistsMappedPromoter() {
        // Given
        PromoterDto dto = new PromoterDto();
        Promoter mappedPromoter = new Promoter();
        when(promoterMapper.toEntity(dto)).thenReturn(mappedPromoter);
        when(promoterRepository.save(mappedPromoter)).thenReturn(mappedPromoter);

        // When
        Promoter result = service.createPromoter(dto);

        // Then
        assertSame(mappedPromoter, result);
        verify(promoterMapper).toEntity(dto);
        verify(promoterRepository).save(mappedPromoter);
    }

    @Test
    void updatePromoter_overridesDtoIdThenFlushesMappedPromoter() {
        // Given
        PromoterDto dto = new PromoterDto();
        Promoter mappedPromoter = new Promoter();
        when(promoterMapper.toEntity(dto)).thenReturn(mappedPromoter);
        when(promoterRepository.saveAndFlush(mappedPromoter)).thenReturn(mappedPromoter);

        // When
        Promoter result = service.updatePromoter(dto, 77L);

        // Then
        assertSame(mappedPromoter, result);
        assertEquals(77L, dto.getId());
        verify(promoterMapper).toEntity(dto);
        verify(promoterRepository).saveAndFlush(mappedPromoter);
    }
}
