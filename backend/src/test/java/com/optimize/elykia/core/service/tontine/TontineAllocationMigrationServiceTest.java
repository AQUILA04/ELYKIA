package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.entity.report.TontineAllocationMigrationRun;
import com.optimize.elykia.core.entity.report.TontineMemberAllocationSnapshot;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineAllocationMigrationRunStatus;
import com.optimize.elykia.core.repository.TontineAllocationMigrationRunRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberAllocationSnapshotRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.service.tontine.allocation.TontineAllocationPolicy;
import com.optimize.elykia.core.service.tontine.allocation.TontineAllocationPolicyResolver;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineAllocationMigrationServiceTest {

    @Mock private TontineAllocationMigrationRunRepository runRepository;
    @Mock private TontineMemberAllocationSnapshotRepository snapshotRepository;
    @Mock private TontineMemberRepository memberRepository;
    @Mock private TontineCollectionRepository collectionRepository;
    @Mock private TontineSessionRepository sessionRepository;
    @Mock private TontineAllocationPolicyResolver policyResolver;
    @Mock private TontineAllocationMigrationJobRunner jobRunner;
    @Mock private TontineAllocationMigrationRun activeRun;
    @Mock private TontineMember member;
    @Mock private Client client;
    @Mock private TontineCollection collection;
    @Mock private TontineAllocationPolicy policy;

    @Test
    void assertWritesAllowed_rejectsTontineWritesWhileMigrationIsPendingOrRunning() {
        // Given
        TontineAllocationMigrationService service = service();
        when(runRepository.findLatestByStatusIn(any())).thenReturn(Optional.of(activeRun));

        // When
        CustomValidationException exception = assertThrows(CustomValidationException.class, service::assertWritesAllowed);

        // Then
        assertEquals("Recalcul des parts société en cours. Les opérations tontine sont temporairement suspendues.",
                exception.getMessage());
    }

    @Test
    void startMigration_createsPendingRunForCurrentSessionAndDispatchesAsyncWorker() {
        // Given
        TontineAllocationMigrationService service = service();
        TontineSession session = new TontineSession();
        session.setId(22L);
        when(runRepository.findLatestByStatusIn(any())).thenReturn(Optional.empty());
        when(sessionRepository.findByYear(LocalDate.now().getYear())).thenReturn(Optional.of(session));
        when(memberRepository.countEnabledBySessionId(22L)).thenReturn(12L);
        when(runRepository.save(any(TontineAllocationMigrationRun.class))).thenAnswer(invocation -> {
            TontineAllocationMigrationRun run = invocation.getArgument(0);
            run.setId(91L);
            return run;
        });
        ArgumentCaptor<TontineAllocationMigrationRun> runCaptor = ArgumentCaptor.forClass(TontineAllocationMigrationRun.class);

        // When
        TontineAllocationMigrationRun run = service.startMigration("V1", "V2", "admin.a");

        // Then
        verify(runRepository).save(runCaptor.capture());
        TontineAllocationMigrationRun created = runCaptor.getValue();
        assertEquals(22L, created.getSessionId());
        assertEquals("V1", created.getFromVersion());
        assertEquals("V2", created.getToVersion());
        assertEquals(TontineAllocationMigrationRunStatus.PENDING, created.getStatus());
        assertEquals("admin.a", created.getTriggeredBy());
        assertEquals(12, created.getTotalMembers());
        assertEquals(0, created.getProcessedMembers());
        assertEquals(0, created.getFailedMembers());
        assertEquals(0L, created.getLastProcessedMemberId());
        assertSame(created, run);
        verify(jobRunner).runAsync(91L);
    }

    @Test
    void processMemberInNewTransaction_isIdempotentWhenSnapshotAlreadyExists() {
        // Given
        TontineAllocationMigrationService service = service();
        when(runRepository.findById(91L)).thenReturn(Optional.of(activeRun));
        when(snapshotRepository.existsByRun_IdAndMemberId(91L, 44L)).thenReturn(true);

        // When
        service.processMemberInNewTransaction(91L, 44L);

        // Then
        verify(memberRepository, never()).findByIdWithClient(any());
        verify(collectionRepository, never()).findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(any(), any());
        verify(snapshotRepository, never()).save(any());
        verify(policyResolver, never()).resolve();
    }

    @Test
    void processMemberInNewTransaction_snapshotsOldAllocationThenRecalculatesAndPersistsMemberAndCollections() {
        // Given
        TontineAllocationMigrationService service = service();
        when(runRepository.findById(91L)).thenReturn(Optional.of(activeRun));
        when(snapshotRepository.existsByRun_IdAndMemberId(91L, 44L)).thenReturn(false);
        when(memberRepository.findByIdWithClient(44L)).thenReturn(Optional.of(member));
        when(member.getId()).thenReturn(44L);
        when(member.getClient()).thenReturn(client);
        when(client.getId()).thenReturn(73L);
        when(member.getSocietyShare()).thenReturn(1_200.0);
        when(member.getTotalContribution()).thenReturn(8_000.0);
        when(member.getAvailableContribution()).thenReturn(6_800.0);
        when(member.getValidatedMonths()).thenReturn(5);
        when(member.getCurrentMonthDays()).thenReturn(12);
        when(collection.getId()).thenReturn(333L);
        when(collection.getSocietyShareAmount()).thenReturn(400.0);
        List<TontineCollection> collections = List.of(collection);
        when(collectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(44L, State.ENABLED))
                .thenReturn(collections);
        when(policyResolver.resolve()).thenReturn(policy);
        ArgumentCaptor<TontineMemberAllocationSnapshot> snapshotCaptor =
                ArgumentCaptor.forClass(TontineMemberAllocationSnapshot.class);

        // When
        service.processMemberInNewTransaction(91L, 44L);

        // Then
        verify(snapshotRepository).save(snapshotCaptor.capture());
        TontineMemberAllocationSnapshot snapshot = snapshotCaptor.getValue();
        assertSame(activeRun, snapshot.getRun());
        assertEquals(44L, snapshot.getMemberId());
        assertEquals(73L, snapshot.getClientId());
        assertEquals(1_200.0, snapshot.getSocietyShare());
        assertEquals(8_000.0, snapshot.getTotalContribution());
        assertEquals(6_800.0, snapshot.getAvailableContribution());
        assertEquals(5, snapshot.getValidatedMonths());
        assertEquals(12, snapshot.getCurrentMonthDays());
        assertEquals(1, snapshot.getCollectionsSocietyShare().size());
        assertEquals(333L, snapshot.getCollectionsSocietyShare().get(0).get("collectionId"));
        assertEquals(400.0, snapshot.getCollectionsSocietyShare().get(0).get("societyShareAmount"));
        verify(policy).recalculateMemberFromCollections(member, collections);
        verify(collectionRepository).saveAll(collections);
        verify(memberRepository).save(member);
    }

    private TontineAllocationMigrationService service() {
        return new TontineAllocationMigrationService(runRepository, snapshotRepository, memberRepository,
                collectionRepository, sessionRepository, policyResolver, jobRunner);
    }
}
