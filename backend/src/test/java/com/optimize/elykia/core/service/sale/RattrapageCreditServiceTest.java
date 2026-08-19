package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.sale.RattrapageCreditDto;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RattrapageCreditServiceTest {

    @Mock
    private CommercialMonthlyStockRepository commercialMonthlyStockRepository;
    @Mock
    private CreditRepository creditRepository;
    @Mock
    private ClientService clientService;
    @Mock
    private CommercialMonthlyStock sourceStock;
    @InjectMocks
    private RattrapageCreditService service;

    @Test
    void createRattrapage_rejectsMissingSourceStockBeforeClientLookup() {
        // Given
        RattrapageCreditDto dto = givenRattrapageDto("collector.a", 100L);
        when(commercialMonthlyStockRepository.findById(100L)).thenReturn(Optional.empty());

        // When / Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> service.createRattrapage(dto));
        assertEquals("Stock source introuvable pour l'identifiant : 100", exception.getMessage());
        verify(clientService, never()).getById(dto.getClientId());
        verify(creditRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void createRattrapage_rejectsSourceStockOwnedByAnotherCommercialBeforeClientLookup() {
        // Given
        RattrapageCreditDto dto = givenRattrapageDto("collector.a", 101L);
        when(commercialMonthlyStockRepository.findById(101L)).thenReturn(Optional.of(sourceStock));
        when(sourceStock.getCollector()).thenReturn("collector.b");

        // When / Then
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.createRattrapage(dto));
        assertEquals("Le stock sélectionné n'appartient pas au commercial : collector.a", exception.getMessage());
        verify(clientService, never()).getById(dto.getClientId());
        verify(creditRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void createRattrapage_rejectsCurrentMonthStockBeforeClientLookup() {
        // Given
        LocalDate now = LocalDate.now();
        RattrapageCreditDto dto = givenRattrapageDto("collector.a", 102L);
        when(commercialMonthlyStockRepository.findById(102L)).thenReturn(Optional.of(sourceStock));
        when(sourceStock.getCollector()).thenReturn("collector.a");
        when(sourceStock.getYear()).thenReturn(now.getYear());
        when(sourceStock.getMonth()).thenReturn(now.getMonthValue());

        // When / Then
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.createRattrapage(dto));
        assertEquals("Impossible d'effectuer un rattrapage sur le stock du mois courant.", exception.getMessage());
        verify(clientService, never()).getById(dto.getClientId());
        verify(creditRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    private RattrapageCreditDto givenRattrapageDto(String commercial, Long sourceStockId) {
        RattrapageCreditDto dto = new RattrapageCreditDto();
        dto.setCommercial(commercial);
        dto.setClientId(50L);
        dto.setSourceStockId(sourceStockId);
        return dto;
    }
}
