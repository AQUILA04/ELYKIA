package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineServiceTest {

    @Mock
    private TontineMemberRepository tontineMemberRepository;
    @Mock
    private TontineSessionRepository tontineSessionRepository;
    @Mock
    private TontineCollectionRepository tontineCollectionRepository;
    @Mock
    private ClientService clientService;
    @Mock
    private UserService userService;
    @Mock
    private ParameterService parameterService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private TontineService service;

    @BeforeEach
    void setUp() {
        service = new TontineService(
                tontineMemberRepository,
                tontineSessionRepository,
                tontineCollectionRepository,
                clientService,
                userService,
                parameterService,
                eventPublisher);
    }

    @Test
    void getActiveSession_createsCurrentYearSessionWithTontineCalendarWhenMissing() {
        // Given
        int currentYear = LocalDate.now().getYear();
        when(tontineSessionRepository.findByYear(currentYear)).thenReturn(Optional.empty());
        when(tontineSessionRepository.save(any(TontineSession.class))).thenAnswer(invocation -> {
            TontineSession session = invocation.getArgument(0);
            session.setId(10L);
            return session;
        });

        // When
        TontineSession result = service.getActiveSession();

        // Then
        assertEquals(10L, result.getId());
        assertEquals(currentYear, result.getYear());
        assertEquals(LocalDate.of(currentYear, 2, 1), result.getStartDate());
        assertEquals(LocalDate.of(currentYear, 11, 30), result.getEndDate());
        assertEquals(TontineSessionStatus.ACTIVE, result.getStatus());
        verify(tontineSessionRepository).save(any(TontineSession.class));
    }

    @Test
    void closeCurrentSession_marksInProgressMembersPendingAndPreservesExistingPendingMembers() {
        // Given
        int currentYear = LocalDate.now().getYear();
        TontineSession session = session(10L, currentYear, TontineSessionStatus.ACTIVE);
        TontineMember inProgress = member(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        TontineMember alreadyPending = member(TontineMemberDeliveryStatus.PENDING);
        when(tontineSessionRepository.findByYear(currentYear)).thenReturn(Optional.of(session));
        when(tontineMemberRepository.findByTontineSessionIdAndState(
                10L, State.ENABLED, PageRequest.of(0, 100)))
                .thenReturn(new PageImpl<>(List.of(inProgress, alreadyPending)));

        // When
        TontineSession result = service.closeCurrentSession();

        // Then
        assertEquals(TontineSessionStatus.CLOSED, result.getStatus());
        assertEquals(TontineMemberDeliveryStatus.PENDING, inProgress.getDeliveryStatus());
        assertEquals(TontineMemberDeliveryStatus.PENDING, alreadyPending.getDeliveryStatus());
        verify(tontineSessionRepository).save(session);
        verify(tontineMemberRepository).saveAll(List.of(inProgress, alreadyPending));
    }

    @Test
    void closeCurrentSession_doesNothingWhenSessionIsAlreadyClosed() {
        // Given
        int currentYear = LocalDate.now().getYear();
        TontineSession session = session(10L, currentYear, TontineSessionStatus.CLOSED);
        when(tontineSessionRepository.findByYear(currentYear)).thenReturn(Optional.of(session));

        // When
        TontineSession result = service.closeCurrentSession();

        // Then
        assertEquals(TontineSessionStatus.CLOSED, result.getStatus());
        verify(tontineSessionRepository, never()).save(session);
        verify(tontineMemberRepository, never()).findByTontineSessionIdAndState(
                10L, State.ENABLED, PageRequest.of(0, 100));
    }

    @Test
    void reopenCurrentSessionForE2e_reactivatesClosedSession() {
        // Given
        int currentYear = LocalDate.now().getYear();
        TontineSession session = session(10L, currentYear, TontineSessionStatus.CLOSED);
        when(tontineSessionRepository.findByYear(currentYear)).thenReturn(Optional.of(session));
        when(tontineSessionRepository.save(session)).thenReturn(session);

        // When
        TontineSession result = service.reopenCurrentSessionForE2e();

        // Then
        assertEquals(TontineSessionStatus.ACTIVE, result.getStatus());
        verify(tontineSessionRepository).save(session);
    }

    private TontineSession session(Long id, int year, TontineSessionStatus status) {
        TontineSession session = new TontineSession();
        session.setId(id);
        session.setYear(year);
        session.setStatus(status);
        return session;
    }

    private TontineMember member(TontineMemberDeliveryStatus deliveryStatus) {
        TontineMember member = new TontineMember();
        member.setDeliveryStatus(deliveryStatus);
        return member;
    }
}
