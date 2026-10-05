package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.BulkCarnetVerificationResultDto;
import com.optimize.elykia.core.dto.CreditRespDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CreditRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreditCarnetVerificationServiceTest {

    @Mock
    private CreditRepository creditRepository;

    private CreditCarnetVerificationService service;

    @BeforeEach
    void setUp() {
        service = new CreditCarnetVerificationService(creditRepository);

        Authentication authentication = mock(Authentication.class);
        org.mockito.Mockito.lenient().when(authentication.isAuthenticated()).thenReturn(true);
        org.mockito.Mockito.lenient().when(authentication.getName()).thenReturn("rm1");
        SecurityContext securityContext = mock(SecurityContext.class);
        org.mockito.Mockito.lenient().when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void setVerifiedMarksCreditAndKeepsAudit() {
        Credit credit = credit(1L, false);
        when(creditRepository.findById(1L)).thenReturn(Optional.of(credit));
        when(creditRepository.save(credit)).thenReturn(credit);

        CreditRespDto result = service.setVerified(1L, true);

        assertThat(result.carnetVerified()).isTrue();
        assertThat(result.carnetVerifiedBy()).isEqualTo("rm1");
        assertThat(result.carnetVerifiedAt()).isNotNull();
    }

    @Test
    void setVerifiedIsIdempotentAndKeepsOriginalAudit() {
        LocalDateTime original = LocalDateTime.of(2026, 3, 1, 10, 0);
        Credit credit = credit(1L, true);
        credit.setCarnetVerifiedAt(original);
        credit.setCarnetVerifiedBy("first-rm");
        when(creditRepository.findById(1L)).thenReturn(Optional.of(credit));
        when(creditRepository.save(credit)).thenReturn(credit);

        CreditRespDto result = service.setVerified(1L, true);

        assertThat(result.carnetVerifiedBy()).isEqualTo("first-rm");
        assertThat(result.carnetVerifiedAt()).isEqualTo(original);
    }

    @Test
    void setVerifiedFalseClearsAudit() {
        Credit credit = credit(1L, true);
        credit.setCarnetVerifiedAt(LocalDateTime.now());
        credit.setCarnetVerifiedBy("rm1");
        when(creditRepository.findById(1L)).thenReturn(Optional.of(credit));
        when(creditRepository.save(credit)).thenReturn(credit);

        CreditRespDto result = service.setVerified(1L, false);

        assertThat(result.carnetVerified()).isFalse();
        assertThat(result.carnetVerifiedAt()).isNull();
        assertThat(result.carnetVerifiedBy()).isNull();
    }

    @Test
    void setVerifiedRejectsSettledCredit() {
        Credit credit = credit(1L, false);
        credit.setStatus(CreditStatus.SETTLED);
        when(creditRepository.findById(1L)).thenReturn(Optional.of(credit));

        assertThatThrownBy(() -> service.setVerified(1L, true))
                .isInstanceOf(CustomValidationException.class)
                .hasMessageContaining("en cours");
    }

    @Test
    void setVerifiedRejectsNonCreditType() {
        Credit credit = credit(1L, false);
        credit.setType(OperationType.CASH);
        when(creditRepository.findById(1L)).thenReturn(Optional.of(credit));

        assertThatThrownBy(() -> service.setVerified(1L, true))
                .isInstanceOf(CustomValidationException.class)
                .hasMessageContaining("vente à crédit");
    }

    @Test
    void bulkSetMarksOnlyUncheckedCredits() {
        Credit a = credit(1L, false);
        Credit b = credit(2L, true);
        b.setCarnetVerifiedBy("already");
        when(creditRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(a, b));
        when(creditRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        BulkCarnetVerificationResultDto result = service.bulkSet(List.of(1L, 2L), true);

        assertThat(result.updated()).isEqualTo(1);
        assertThat(result.skipped()).isEqualTo(1);
        assertThat(result.requested()).isEqualTo(2);
        assertThat(a.getCarnetVerified()).isTrue();
        assertThat(b.getCarnetVerifiedBy()).isEqualTo("already");
    }

    @Test
    void bulkSetRejectsUnmark() {
        assertThatThrownBy(() -> service.bulkSet(List.of(1L), false))
                .isInstanceOf(CustomValidationException.class)
                .hasMessageContaining("décocher");
    }

    @Test
    void bulkSetRejectsUnknownCredit() {
        when(creditRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(credit(1L, false)));

        assertThatThrownBy(() -> service.bulkSet(List.of(1L, 2L), true))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void bulkSetRejectsOversizedBatch() {
        List<Long> ids = java.util.stream.LongStream.rangeClosed(1, 501).boxed().toList();
        assertThatThrownBy(() -> service.bulkSet(ids, true))
                .isInstanceOf(CustomValidationException.class)
                .hasMessageContaining("500");
    }

    private Credit credit(Long id, boolean verified) {
        Credit credit = new Credit();
        credit.setId(id);
        credit.setType(OperationType.CREDIT);
        credit.setStatus(CreditStatus.INPROGRESS);
        credit.setCarnetVerified(verified);
        return credit;
    }
}
