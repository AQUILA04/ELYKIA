package com.optimize.elykia.core.service.tontine.conflict;

import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineDeliveryConflict;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineDeliveryConflictOperation;
import com.optimize.elykia.core.enumaration.TontineDeliveryConflictOutcome;
import com.optimize.elykia.core.enumaration.TontineDeliveryConflictReason;
import com.optimize.elykia.core.repository.TontineDeliveryConflictRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TontineDeliveryConflictServiceTest {

    @Mock
    private TontineDeliveryConflictRepository repository;

    @InjectMocks
    private TontineDeliveryConflictService service;

    private TontineMember member;
    private TontineDelivery existing;

    @BeforeEach
    void setUp() {
        TontineSession session = new TontineSession();
        session.setId(3L);
        Client client = new Client();
        client.setId(9L);
        client.setCollector("COM005");
        member = new TontineMember();
        member.setId(1L);
        member.setClient(client);
        member.setTontineSession(session);
        member.setAvailableContribution(40_000.0);

        existing = new TontineDelivery();
        existing.setId(20L);
        existing.setReference("LIV-A");
        existing.setTotalAmount(30_000.0);
        existing.setDeliveryDate(LocalDateTime.of(2026, 11, 20, 10, 0));
    }

    @Test
    void record_createsAJournalLineWithBothRecords() {
        when(repository.findFirstByTontineMemberIdAndOperationAndIncomingReferenceOrderByIdDesc(
                1L, TontineDeliveryConflictOperation.DIRECT_DELIVERY, "LIV-B")).thenReturn(Optional.empty());

        service.record(member, existing,
                new TontineDeliveryConflictService.Incoming(
                        TontineDeliveryConflictOperation.DIRECT_DELIVERY, " LIV-B ", 25_000.0, "1 × Riz"),
                TontineDeliveryConflictOutcome.REJECTED, TontineDeliveryConflictReason.ALREADY_DELIVERED);

        ArgumentCaptor<TontineDeliveryConflict> captor = ArgumentCaptor.forClass(TontineDeliveryConflict.class);
        verify(repository).save(captor.capture());
        TontineDeliveryConflict saved = captor.getValue();
        assertEquals(1L, saved.getTontineMemberId());
        assertEquals(3L, saved.getTontineSessionId());
        assertEquals("COM005", saved.getCommercialUsername());
        assertEquals("LIV-B", saved.getIncomingReference());
        assertEquals(25_000.0, saved.getIncomingAmount());
        assertEquals("1 × Riz", saved.getIncomingItems());
        assertEquals(20L, saved.getExistingDeliveryId());
        assertEquals("LIV-A", saved.getExistingReference());
        assertEquals(40_000.0, saved.getAvailableBalance());
        assertEquals(1, saved.getAttempts());
        assertNotNull(saved.getFirstSeenAt());
        assertEquals(saved.getFirstSeenAt(), saved.getLastSeenAt());
    }

    @Test
    void record_countsAReplayedRejectionInsteadOfAddingALine() {
        TontineDeliveryConflict previous = new TontineDeliveryConflict();
        previous.setId(5L);
        previous.setOutcome(TontineDeliveryConflictOutcome.REJECTED);
        previous.setReason(TontineDeliveryConflictReason.ALREADY_DELIVERED);
        previous.setAttempts(2);
        previous.setFirstSeenAt(LocalDateTime.of(2026, 11, 19, 8, 0));
        when(repository.findFirstByTontineMemberIdAndOperationAndIncomingReferenceOrderByIdDesc(
                1L, TontineDeliveryConflictOperation.DIRECT_DELIVERY, "LIV-B")).thenReturn(Optional.of(previous));

        service.record(member, existing,
                new TontineDeliveryConflictService.Incoming(
                        TontineDeliveryConflictOperation.DIRECT_DELIVERY, "LIV-B", 25_000.0, "1 × Riz"),
                TontineDeliveryConflictOutcome.REJECTED, TontineDeliveryConflictReason.ALREADY_DELIVERED);

        verify(repository).save(same(previous));
        assertEquals(3, previous.getAttempts());
        assertEquals(LocalDateTime.of(2026, 11, 19, 8, 0), previous.getFirstSeenAt());
        assertTrue(previous.getLastSeenAt().isAfter(previous.getFirstSeenAt()));
    }

    @Test
    void record_keepsANewLineWhenTheOutcomeChanged() {
        TontineDeliveryConflict previous = new TontineDeliveryConflict();
        previous.setOutcome(TontineDeliveryConflictOutcome.REJECTED);
        previous.setReason(TontineDeliveryConflictReason.BALANCE_EXCEEDED);
        previous.setAttempts(1);
        when(repository.findFirstByTontineMemberIdAndOperationAndIncomingReferenceOrderByIdDesc(
                1L, TontineDeliveryConflictOperation.ORDER, "LIV-B")).thenReturn(Optional.of(previous));

        service.record(member, existing,
                new TontineDeliveryConflictService.Incoming(TontineDeliveryConflictOperation.ORDER, "LIV-B", 10_000.0, ""),
                TontineDeliveryConflictOutcome.MERGED, TontineDeliveryConflictReason.ORDER_MERGED);

        ArgumentCaptor<TontineDeliveryConflict> captor = ArgumentCaptor.forClass(TontineDeliveryConflict.class);
        verify(repository).save(captor.capture());
        assertNotSame(previous, captor.getValue());
        assertEquals(TontineDeliveryConflictOutcome.MERGED, captor.getValue().getOutcome());
        assertEquals(1, previous.getAttempts());
    }

    @Test
    void record_keepsTheReceiptCodeOfTheMergedOrderSoItStaysVerifiable() {
        when(repository.findFirstByTontineMemberIdAndOperationAndIncomingReferenceOrderByIdDesc(
                1L, TontineDeliveryConflictOperation.ORDER, "LIV-B")).thenReturn(Optional.empty());

        service.record(member, existing,
                new TontineDeliveryConflictService.Incoming(
                        TontineDeliveryConflictOperation.ORDER, "LIV-B", 10_000.0, "1 × Riz", " ely-bbbb-2222 "),
                TontineDeliveryConflictOutcome.MERGED, TontineDeliveryConflictReason.ORDER_MERGED);

        ArgumentCaptor<TontineDeliveryConflict> captor = ArgumentCaptor.forClass(TontineDeliveryConflict.class);
        verify(repository).save(captor.capture());
        assertEquals("ELY-BBBB-2222", captor.getValue().getIncomingAuthenticityCode());
    }

    @Test
    void mergedDeliveryIdForReceiptCode_looksUpOnlyMergedOrders() {
        TontineDeliveryConflict conflict = new TontineDeliveryConflict();
        conflict.setExistingDeliveryId(20L);
        when(repository.findFirstByIncomingAuthenticityCodeAndOutcomeOrderByIdDesc(
                "ELY-BBBB-2222", TontineDeliveryConflictOutcome.MERGED)).thenReturn(Optional.of(conflict));

        assertEquals(Optional.of(20L), service.mergedDeliveryIdForReceiptCode("ely-bbbb-2222"));
        assertEquals(Optional.empty(), service.mergedDeliveryIdForReceiptCode(" "));
    }

    @Test
    void wasAlreadyMerged_ignoresMissingReference() {
        assertFalse(service.wasAlreadyMerged(1L, " "));
        assertFalse(service.wasAlreadyMerged(null, "LIV-B"));
        verifyNoInteractions(repository);
    }

    @Test
    void search_alwaysBindsBothDateBounds() {
        when(repository.search(any(), any(), isNull(), isNull(), any())).thenReturn(new PageImpl<>(List.of()));

        service.search(null, LocalDate.of(2026, 11, 20), " ", null, Pageable.unpaged());

        verify(repository).search(eq(LocalDate.of(2000, 1, 1).atStartOfDay()),
                argThat(to -> to.toLocalDate().equals(LocalDate.of(2026, 11, 20))),
                isNull(), isNull(), any());
    }
}
