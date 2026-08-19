package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.dto.sale.CloseCreditsRequestDto;
import com.optimize.elykia.core.dto.sale.CloseCreditsResponseDto;
import com.optimize.elykia.core.dto.sale.CreditCloseItemDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.RecoveryManagerOperation;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.repository.RecoveryManagerOperationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecoveryManagerServiceTest {

    @Mock
    private CreditTimelineService creditTimelineService;
    @Mock
    private CreditService creditService;
    @Mock
    private ClientReliquatService clientReliquatService;
    @Mock
    private RecoveryManagerOperationRepository operationRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @InjectMocks
    private RecoveryManagerService service;

    @Test
    void closeCredits_returnsExistingOperationWhenReferenceWasAlreadyProcessed() {
        // Given
        CreditCloseItemDto item = item(10L, 50_000.0, false, "  RCV-MOBILE-001  ");
        RecoveryManagerOperation existing = new RecoveryManagerOperation();
        existing.setCreditId(10L);
        existing.setCreditReference("CR-2026-001");
        existing.setClientName("Client Recouvrement");
        when(operationRepository.findByReference("RCV-MOBILE-001")).thenReturn(Optional.of(existing));

        // When
        CloseCreditsResponseDto result = service.closeCredits(request(item), "recovery.manager");

        // Then
        assertEquals(1, result.getSuccesses().size());
        assertEquals(0, result.getFailures().size());
        assertEquals(10L, result.getSuccesses().get(0).getCreditId());
        assertEquals(existing, result.getSuccesses().get(0).getOperation());
        verify(creditService, never()).getById(10L);
        verify(operationRepository).findByReference("RCV-MOBILE-001");
    }

    @Test
    void closeCredits_rejectsCreditOutsideInProgressStatusWithoutPersistingOperation() {
        // Given
        CreditCloseItemDto item = item(11L, 50_000.0, false, null);
        Credit credit = credit(11L, CreditStatus.SETTLED, LocalDate.now().minusDays(1), 50_000.0);
        when(creditService.getById(11L)).thenReturn(credit);

        // When
        CloseCreditsResponseDto result = service.closeCredits(request(item), "recovery.manager");

        // Then
        assertEquals(0, result.getSuccesses().size());
        assertEquals(1, result.getFailures().size());
        assertEquals("CR-2026-011", result.getFailures().get(0).getCreditReference());
        assertEquals("Le crédit n'est pas en cours (INPROGRESS)", result.getFailures().get(0).getErrorMessage());
        verify(operationRepository, never()).save(org.mockito.ArgumentMatchers.any());
        verify(eventPublisher, never()).publishEvent(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void closeCredits_rejectsInProgressCreditWhoseExpectedEndDateIsNotExceeded() {
        // Given
        CreditCloseItemDto item = item(12L, 50_000.0, false, null);
        Credit credit = credit(12L, CreditStatus.INPROGRESS, LocalDate.now(), 50_000.0);
        when(creditService.getById(12L)).thenReturn(credit);

        // When
        CloseCreditsResponseDto result = service.closeCredits(request(item), "recovery.manager");

        // Then
        assertEquals(0, result.getSuccesses().size());
        assertEquals(1, result.getFailures().size());
        assertEquals("La date de fin du crédit n'est pas encore dépassée", result.getFailures().get(0).getErrorMessage());
        verify(operationRepository, never()).existsByCreditIdAndOperationDate(12L, LocalDate.now());
        verify(operationRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    private CloseCreditsRequestDto request(CreditCloseItemDto... items) {
        CloseCreditsRequestDto request = new CloseCreditsRequestDto();
        request.setItems(List.of(items));
        return request;
    }

    private CreditCloseItemDto item(Long creditId, double amount, boolean partial, String reference) {
        CreditCloseItemDto item = new CreditCloseItemDto();
        item.setCreditId(creditId);
        item.setAmount(amount);
        item.setIsPartial(partial);
        item.setReference(reference);
        return item;
    }

    private Credit credit(Long id, CreditStatus status, LocalDate expectedEndDate, double remainingAmount) {
        Credit credit = new Credit();
        credit.setId(id);
        credit.setStatus(status);
        credit.setReference(String.format("CR-2026-%03d", id));
        credit.setExpectedEndDate(expectedEndDate);
        credit.setTotalAmountRemaining(remainingAmount);
        return credit;
    }
}
