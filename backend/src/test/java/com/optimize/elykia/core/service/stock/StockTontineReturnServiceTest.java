package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.stock.StockReturnKpiDto;
import com.optimize.elykia.core.dto.stock.StockTontineReturnListDto;
import com.optimize.elykia.core.entity.stock.StockTontineReturn;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import com.optimize.elykia.core.repository.StockTontineReturnRepository;
import com.optimize.elykia.core.service.tontine.TontineStockService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockTontineReturnServiceTest {

    @Mock
    private StockTontineReturnRepository repository;
    @Mock
    private UserService userService;
    @Mock
    private TontineStockService tontineStockService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @InjectMocks
    private StockTontineReturnService service;

    @Test
    void getKpis_aggregatesVisibleReturnStatuses() {
        // Given
        LocalDate startDate = LocalDate.of(2026, 8, 1);
        LocalDate endDate = LocalDate.of(2026, 8, 31);
        List<StockReturnStatus> visibleStatuses = List.of(
                StockReturnStatus.CREATED,
                StockReturnStatus.RECEIVED,
                StockReturnStatus.CANCELLED,
                StockReturnStatus.REFUSED);
        when(repository.countByStatusFiltered("collector.a", startDate, endDate, visibleStatuses)).thenReturn(List.of(
                new Object[]{StockReturnStatus.CREATED, 2L},
                new Object[]{StockReturnStatus.RECEIVED, 3L},
                new Object[]{StockReturnStatus.CANCELLED, 4L},
                new Object[]{StockReturnStatus.REFUSED, 1L}));

        // When
        StockReturnKpiDto result = service.getKpis("collector.a", startDate, endDate);

        // Then
        assertEquals(10L, result.getTotal());
        assertEquals(2L, result.getPending());
        assertEquals(3L, result.getReceived());
        assertEquals(5L, result.getCancelledRefused());
        verify(repository).countByStatusFiltered("collector.a", startDate, endDate, visibleStatuses);
    }

    @Test
    void getAll_usesRequestedCollectorAndAllVisibleStatuses() {
        // Given
        LocalDate startDate = LocalDate.of(2026, 8, 1);
        LocalDate endDate = LocalDate.of(2026, 8, 31);
        Pageable pageable = PageRequest.of(0, 20);
        Page<StockTontineReturnListDto> expectedPage = Page.empty(pageable);
        List<StockReturnStatus> visibleStatuses = List.of(
                StockReturnStatus.CREATED,
                StockReturnStatus.RECEIVED,
                StockReturnStatus.CANCELLED,
                StockReturnStatus.REFUSED);
        when(repository.findFilteredList("collector.a", startDate, endDate, visibleStatuses, pageable))
                .thenReturn(expectedPage);

        // When
        Page<StockTontineReturnListDto> result = service.getAll("collector.a", startDate, endDate, pageable);

        // Then
        assertSame(expectedPage, result);
        verify(repository).findFilteredList("collector.a", startDate, endDate, visibleStatuses, pageable);
    }

    @Test
    void validate_rejectsReturnThatIsNotCreatedWithoutUpdatingTontineStock() {
        // Given
        StockTontineReturn returnRequest = new StockTontineReturn();
        returnRequest.setStatus(StockReturnStatus.RECEIVED);
        when(repository.findByIdForUpdate(15L)).thenReturn(Optional.of(returnRequest));

        // When / Then
        CustomValidationException exception = assertThrows(CustomValidationException.class, () -> service.validate(15L));
        assertEquals("Seuls les retours au statut CREATED peuvent être validés.", exception.getMessage());
        verify(tontineStockService, never()).processStockReturn(returnRequest);
        verify(repository, never()).saveAndFlush(returnRequest);
    }
}
