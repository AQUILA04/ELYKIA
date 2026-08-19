package com.optimize.elykia.core.service;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.CreateCreditFieldControlDto;
import com.optimize.elykia.core.dto.CreditFieldControlDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.service.sale.CreditFieldControlService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreditFieldControlServiceTest {

    private static final Long CREDIT_ID = 25L;

    @Mock
    private CreditFieldControlRepository controlRepository;
    @Mock
    private CreditRepository creditRepository;
    @InjectMocks
    private CreditFieldControlService creditFieldControlService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void create_recordsConformeControlWithTrimmedIdempotencyReference() {
        // Given
        authenticateAs("field.agent");
        Credit credit = credit(300.0);
        LocalDateTime observedAt = LocalDateTime.of(2026, 8, 19, 9, 30);
        CreateCreditFieldControlDto dto = controlDto("  CTRL-001  ", 300.0, observedAt);
        when(controlRepository.existsByReference("CTRL-001")).thenReturn(false);
        when(creditRepository.findById(CREDIT_ID)).thenReturn(Optional.of(credit));
        when(controlRepository.save(any(CreditFieldControl.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        CreditFieldControlDto result = creditFieldControlService.create(CREDIT_ID, dto);

        // Then
        assertEquals(CREDIT_ID, result.getCreditId());
        assertEquals("CTRL-001", result.getReference());
        assertEquals(300.0, result.getNotebookTotalAmount());
        assertEquals(300.0, result.getSystemTotalAmountPaid());
        assertEquals(0.0, result.getDifferenceAmount());
        assertEquals(FieldControlStatus.CONFORME, result.getStatus());
        assertEquals(observedAt, result.getObservedAt());
        assertEquals("field.agent", result.getObservedBy());

        ArgumentCaptor<CreditFieldControl> captor = ArgumentCaptor.forClass(CreditFieldControl.class);
        verify(controlRepository).save(captor.capture());
        assertSame(credit, captor.getValue().getCredit());
    }

    @Test
    void create_marksControlAsEcartWhenNotebookAndSystemAmountsDiffer() {
        // Given
        authenticateAs("field.agent");
        Credit credit = credit(180.0);
        CreateCreditFieldControlDto dto = controlDto("CTRL-002", 220.0, null);
        when(controlRepository.existsByReference("CTRL-002")).thenReturn(false);
        when(creditRepository.findById(CREDIT_ID)).thenReturn(Optional.of(credit));
        when(controlRepository.save(any(CreditFieldControl.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        CreditFieldControlDto result = creditFieldControlService.create(CREDIT_ID, dto);

        // Then
        assertEquals(40.0, result.getDifferenceAmount());
        assertEquals(FieldControlStatus.ECART, result.getStatus());
        verify(controlRepository).save(any(CreditFieldControl.class));
    }

    @Test
    void create_returnsExistingControlWhenReferenceHasAlreadyBeenProcessed() {
        // Given
        CreditFieldControl existing = control(credit(50.0), "CTRL-003", 55.0, 50.0, FieldControlStatus.ECART);
        when(controlRepository.existsByReference("CTRL-003")).thenReturn(true);
        when(controlRepository.findByReference("CTRL-003")).thenReturn(Optional.of(existing));

        // When
        CreditFieldControlDto result = creditFieldControlService.create(CREDIT_ID, controlDto(" CTRL-003 ", 55.0, null));

        // Then
        assertEquals("CTRL-003", result.getReference());
        assertEquals(FieldControlStatus.ECART, result.getStatus());
        verify(creditRepository, never()).findById(any());
        verify(controlRepository, never()).save(any());
    }

    @Test
    void getLatest_rejectsWhenNoControlExistsForCredit() {
        // Given
        when(controlRepository.findFirstByCredit_idAndStateOrderByObservedAtDesc(CREDIT_ID, State.ENABLED))
                .thenReturn(Optional.empty());

        // When / Then
        assertThrows(ResourceNotFoundException.class, () -> creditFieldControlService.getLatest(CREDIT_ID));
    }

    @Test
    void getHistory_mapsEveryEnabledControlInObservationOrder() {
        // Given
        Credit credit = credit(100.0);
        CreditFieldControl latest = control(credit, "CTRL-005", 100.0, 100.0, FieldControlStatus.CONFORME);
        CreditFieldControl earlier = control(credit, "CTRL-004", 90.0, 100.0, FieldControlStatus.ECART);
        when(controlRepository.findByCredit_idAndStateOrderByObservedAtDesc(CREDIT_ID, State.ENABLED))
                .thenReturn(List.of(latest, earlier));

        // When
        List<CreditFieldControlDto> result = creditFieldControlService.getHistory(CREDIT_ID);

        // Then
        assertEquals(List.of("CTRL-005", "CTRL-004"), result.stream().map(CreditFieldControlDto::getReference).toList());
        assertEquals(List.of(FieldControlStatus.CONFORME, FieldControlStatus.ECART),
                result.stream().map(CreditFieldControlDto::getStatus).toList());
    }

    private void authenticateAs(String username) {
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(username, "test"));
    }

    private CreateCreditFieldControlDto controlDto(String reference, double notebookAmount, LocalDateTime observedAt) {
        CreateCreditFieldControlDto dto = new CreateCreditFieldControlDto();
        dto.setReference(reference);
        dto.setNotebookTotalAmount(notebookAmount);
        dto.setObservedAt(observedAt);
        dto.setNote("Contrôle terrain");
        return dto;
    }

    private Credit credit(double totalAmountPaid) {
        Credit credit = new Credit();
        credit.setId(CREDIT_ID);
        credit.setTotalAmountPaid(totalAmountPaid);
        return credit;
    }

    private CreditFieldControl control(Credit credit, String reference, double notebookAmount,
            double systemAmount, FieldControlStatus status) {
        CreditFieldControl control = new CreditFieldControl();
        control.setCredit(credit);
        control.setReference(reference);
        control.setNotebookTotalAmount(notebookAmount);
        control.setSystemTotalAmountPaid(systemAmount);
        control.setDifferenceAmount(notebookAmount - systemAmount);
        control.setStatus(status);
        control.setObservedAt(LocalDateTime.of(2026, 8, 19, 10, 0));
        control.setObservedBy("field.agent");
        return control;
    }
}
