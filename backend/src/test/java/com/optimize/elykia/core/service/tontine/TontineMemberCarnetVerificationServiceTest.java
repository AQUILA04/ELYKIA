package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.BulkCarnetVerificationResultDto;
import com.optimize.elykia.core.dto.TontineMemberRespDto;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineMemberCarnetVerificationServiceTest {

    @Mock private TontineMemberRepository tontineMemberRepository;
    @Mock private TontineSessionRepository tontineSessionRepository;

    private TontineMemberCarnetVerificationService service;
    private TontineSession activeSession;

    @BeforeEach
    void setUp() {
        service = new TontineMemberCarnetVerificationService(tontineMemberRepository, tontineSessionRepository);
        activeSession = session(10L, LocalDate.now().getYear(), TontineSessionStatus.ACTIVE);

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
    void setVerifiedMarksMemberAndKeepsAudit() {
        TontineMember member = member(1L, false);
        when(tontineSessionRepository.findByYear(LocalDate.now().getYear())).thenReturn(Optional.of(activeSession));
        when(tontineMemberRepository.findByIdWithClient(1L)).thenReturn(Optional.of(member));
        when(tontineMemberRepository.save(member)).thenReturn(member);

        TontineMemberRespDto result = service.setVerified(1L, true);

        assertThat(result.carnetVerified()).isTrue();
        assertThat(result.carnetVerifiedBy()).isEqualTo("rm1");
        assertThat(result.carnetVerifiedAt()).isNotNull();
    }

    @Test
    void setVerifiedIsIdempotentAndKeepsOriginalAudit() {
        LocalDateTime original = LocalDateTime.of(2026, 3, 1, 10, 0);
        TontineMember member = member(1L, true);
        member.setCarnetVerifiedAt(original);
        member.setCarnetVerifiedBy("first-rm");
        when(tontineSessionRepository.findByYear(LocalDate.now().getYear())).thenReturn(Optional.of(activeSession));
        when(tontineMemberRepository.findByIdWithClient(1L)).thenReturn(Optional.of(member));
        when(tontineMemberRepository.save(member)).thenReturn(member);

        TontineMemberRespDto result = service.setVerified(1L, true);

        assertThat(result.carnetVerifiedBy()).isEqualTo("first-rm");
        assertThat(result.carnetVerifiedAt()).isEqualTo(original);
    }

    @Test
    void setVerifiedFalseClearsAudit() {
        TontineMember member = member(1L, true);
        member.setCarnetVerifiedAt(LocalDateTime.now());
        member.setCarnetVerifiedBy("rm1");
        when(tontineSessionRepository.findByYear(LocalDate.now().getYear())).thenReturn(Optional.of(activeSession));
        when(tontineMemberRepository.findByIdWithClient(1L)).thenReturn(Optional.of(member));
        when(tontineMemberRepository.save(member)).thenReturn(member);

        TontineMemberRespDto result = service.setVerified(1L, false);

        assertThat(result.carnetVerified()).isFalse();
        assertThat(result.carnetVerifiedAt()).isNull();
        assertThat(result.carnetVerifiedBy()).isNull();
    }

    @Test
    void bulkSetMarksOnlyUncheckedMembers() {
        TontineMember a = member(1L, false);
        TontineMember b = member(2L, true);
        b.setCarnetVerifiedBy("already");
        when(tontineSessionRepository.findByYear(LocalDate.now().getYear())).thenReturn(Optional.of(activeSession));
        when(tontineMemberRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(a, b));
        when(tontineMemberRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        BulkCarnetVerificationResultDto result = service.bulkSet(List.of(1L, 2L), true);

        assertThat(result.updated()).isEqualTo(1);
        assertThat(result.skipped()).isEqualTo(1);
        assertThat(result.requested()).isEqualTo(2);
        assertThat(a.getCarnetVerified()).isTrue();
        assertThat(b.getCarnetVerifiedBy()).isEqualTo("already");
    }

    @Test
    void bulkSetRejectsWhenSessionClosed() {
        activeSession.setStatus(TontineSessionStatus.CLOSED);
        when(tontineSessionRepository.findByYear(LocalDate.now().getYear())).thenReturn(Optional.of(activeSession));

        assertThatThrownBy(() -> service.bulkSet(List.of(1L), true))
                .isInstanceOf(CustomValidationException.class)
                .hasMessageContaining("active");
    }

    @Test
    void bulkSetRejectsUnmark() {
        assertThatThrownBy(() -> service.bulkSet(List.of(1L), false))
                .isInstanceOf(CustomValidationException.class)
                .hasMessageContaining("décocher");
    }

    @Test
    void bulkSetRejectsUnknownMember() {
        when(tontineSessionRepository.findByYear(LocalDate.now().getYear())).thenReturn(Optional.of(activeSession));
        when(tontineMemberRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(member(1L, false)));

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

    private TontineMember member(Long id, boolean verified) {
        Client client = new Client();
        client.setId(id);
        client.setFirstname("Ama");
        client.setLastname("Koffi");
        TontineMember member = new TontineMember();
        member.setId(id);
        member.setClient(client);
        member.setTontineSession(activeSession);
        member.setCarnetVerified(verified);
        return member;
    }

    private static TontineSession session(Long id, int year, TontineSessionStatus status) {
        TontineSession session = new TontineSession();
        session.setId(id);
        session.setYear(year);
        session.setStatus(status);
        session.setStartDate(LocalDate.of(year, 2, 1));
        session.setEndDate(LocalDate.of(year, 11, 30));
        return session;
    }
}
