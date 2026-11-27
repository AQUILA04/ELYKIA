package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.AdjustTontineSocietyShareDto;
import com.optimize.elykia.core.dto.TontineSocietyShareAdjustmentDto;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.entity.tontine.TontineSocietyShareAdjustment;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.enumaration.TontineSocietyShareAdjustmentOutcome;
import com.optimize.elykia.core.enumaration.TontineSocietyShareStatus;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSocietyShareAdjustmentRepository;
import com.optimize.elykia.core.service.tontine.allocation.TontineProjectedBalanceCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TontineSocietyShareAdjustmentServiceTest {

    @Mock private TontineMemberRepository memberRepository;
    @Mock private TontineCollectionRepository collectionRepository;
    @Mock private TontineSocietyShareAdjustmentRepository adjustmentRepository;
    @Mock private TontineDeliveryRepository deliveryRepository;
    @Mock private TontineService tontineService;
    @Mock private UserService userService;
    @Mock private TontineProjectedBalanceCalculator projectedBalanceCalculator;
    @Mock private User user;

    private TontineSocietyShareAdjustmentService service;
    private TontineMember member;

    @BeforeEach
    void setUp() {
        service = new TontineSocietyShareAdjustmentService(memberRepository, collectionRepository,
                adjustmentRepository, deliveryRepository, tontineService, userService, projectedBalanceCalculator);
        member = new TontineMember();
        member.setId(7L);
        TontineSession session = new TontineSession();
        session.setId(1L);
        session.setStatus(TontineSessionStatus.ACTIVE);
        member.setTontineSession(session);
        Client client = new Client();
        client.setTontineCollector("com1");
        member.setClient(client);
        member.setDeliveryStatus(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        member.setTotalContribution(10000.0);
        member.setSocietyShare(1000.0);
        member.setSocietyShareComputed(1000.0);
        member.setAvailableContribution(9000.0);

        lenient().when(memberRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(member));
        lenient().when(userService.getCurrentUser()).thenReturn(user);
        lenient().when(user.getUsername()).thenReturn("com1");
        lenient().when(user.is(anyString())).thenReturn(false);
        lenient().when(user.is("PROMOTER")).thenReturn(true);
        lenient().when(collectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(7L, State.ENABLED))
                .thenReturn(List.of(collection(10000.0)));
        lenient().when(adjustmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(deliveryRepository.findByTontineMemberId(7L)).thenReturn(Optional.empty());
    }

    @Test
    void equalAmountValidatesWithoutRecalculation() {
        TontineSocietyShareAdjustmentDto result = service.adjust(7L, dto(1000.4));

        assertEquals(TontineSocietyShareAdjustmentOutcome.VALIDATED, result.getOutcome());
        assertEquals(TontineSocietyShareStatus.CONFIRMED, member.getSocietyShareStatus());
        assertNull(member.getSocietyShareOverride());
        assertEquals(0.0, result.getDelta());
        verify(tontineService, never()).recalculateMemberAfterSocietyShareChange(any());
    }

    @Test
    void differentAmountReplacesTheShareAndRecalculates() {
        doAnswer(inv -> {
            member.setSocietyShare(member.getSocietyShareOverride());
            member.setAvailableContribution(10000.0 - member.getSocietyShareOverride());
            return null;
        }).when(tontineService).recalculateMemberAfterSocietyShareChange(member);

        TontineSocietyShareAdjustmentDto result = service.adjust(7L, dto(3000.0));

        assertEquals(TontineSocietyShareAdjustmentOutcome.ADJUSTED, result.getOutcome());
        assertEquals(3000.0, member.getSocietyShareOverride());
        assertEquals(TontineSocietyShareStatus.ADJUSTED, member.getSocietyShareStatus());
        assertFalse(Boolean.TRUE.equals(member.getSocietyShareLocked()));
        assertEquals(1000.0, result.getComputedSocietyShare());
        assertEquals(1000.0, result.getPreviousSocietyShare());
        assertEquals(3000.0, result.getNewSocietyShare());
        assertEquals(2000.0, result.getDelta());
        assertEquals(9000.0, result.getPreviousAvailable());
        assertEquals(7000.0, result.getNewAvailable());
    }

    @Test
    void recoveryManagerLocksTheShare() {
        lenient().when(user.is("PROMOTER")).thenReturn(false);
        when(user.is("RECOVERY_MANAGER")).thenReturn(true);

        service.adjust(7L, dto(1000.0));

        assertTrue(member.getSocietyShareLocked());
    }

    @Test
    void commercialIsRejectedOnceRecoveryManagerValidated() {
        member.setSocietyShareLocked(true);

        assertThrows(CustomValidationException.class, () -> service.adjust(7L, dto(3000.0)));
        verify(tontineService, never()).recalculateMemberAfterSocietyShareChange(any());
    }

    @Test
    void commercialAdjustmentDuringOrderIsRecordedAsRejected() {
        member.setSocietyShareLocked(true);

        TontineSocietyShareAdjustmentDto result = service.adjustForDelivery(member, dto(3000.0), "CMD-1");

        assertEquals(TontineSocietyShareAdjustmentOutcome.REJECTED, result.getOutcome());
        assertNull(member.getSocietyShareOverride());
        assertEquals(1000.0, member.getSocietyShare());
    }

    @Test
    void deliveredMemberIsReadOnly() {
        member.setDeliveryStatus(TontineMemberDeliveryStatus.DELIVERED);
        assertThrows(CustomValidationException.class, () -> service.adjust(7L, dto(3000.0)));
    }

    @Test
    void noCollectionMeansNoAdjustment() {
        when(collectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(7L, State.ENABLED))
                .thenReturn(List.of());
        assertThrows(CustomValidationException.class, () -> service.adjust(7L, dto(3000.0)));
    }

    @Test
    void amountAboveRegularContributionsIsRefused() {
        assertThrows(CustomValidationException.class, () -> service.adjust(7L, dto(10002.0)));
    }

    @Test
    void otherCommercialsMemberIsRefused() {
        when(user.getUsername()).thenReturn("com2");
        assertThrows(CustomValidationException.class, () -> service.adjust(7L, dto(3000.0)));
    }

    @Test
    void replayedReferenceReturnsTheStoredResult() {
        TontineSocietyShareAdjustment stored = new TontineSocietyShareAdjustment();
        stored.setReference("ref-1");
        stored.setOutcome(TontineSocietyShareAdjustmentOutcome.ADJUSTED);
        stored.setAdjustedAt(LocalDateTime.now());
        when(adjustmentRepository.findFirstByReference("ref-1")).thenReturn(Optional.of(stored));
        AdjustTontineSocietyShareDto dto = dto(3000.0);
        dto.setReference("ref-1");

        TontineSocietyShareAdjustmentDto result = service.adjust(7L, dto);

        assertEquals("ref-1", result.getReference());
        verify(adjustmentRepository, never()).save(any());
        verify(tontineService, never()).recalculateMemberAfterSocietyShareChange(any());
    }

    private static AdjustTontineSocietyShareDto dto(double amount) {
        AdjustTontineSocietyShareDto dto = new AdjustTontineSocietyShareDto();
        dto.setDeclaredSocietyShare(amount);
        return dto;
    }

    private static TontineCollection collection(double amount) {
        TontineCollection collection = new TontineCollection();
        collection.setAmount(amount);
        return collection;
    }
}
