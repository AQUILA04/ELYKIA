package com.optimize.elykia.core.service;

import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistory;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.service.tontine.allocation.TontineAmountHistoryHelper;
import com.optimize.elykia.core.service.tontine.allocation.V1TontineAllocationPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineCollectionAllocationTest {

    @Mock
    private ParameterService parameterService;

    private V1TontineAllocationPolicy policy;
    private int year;

    @BeforeEach
    void setUp() {
        TontineAmountHistoryHelper helper = new TontineAmountHistoryHelper(parameterService);
        policy = new V1TontineAllocationPolicy(helper);
        year = LocalDate.now().getYear();
        lenient().when(parameterService.isEnabled("USE_MEMBER_REGISTRATION_DATE_FOR_SHARE")).thenReturn(false);
    }

    @Test
    void calculateTargetSocietyShare_usesAllocationCutoff_notToday() {
        TontineMember member = buildMember(LocalDate.of(year, 1, 1), 1000.0);
        member.setSocietyShare(1000.0);

        double targetThroughFebruary = policy.calculateTargetSocietyShare(member, LocalDate.of(year, 2, 28));
        double targetThroughJune = policy.calculateTargetSocietyShare(member, LocalDate.of(year, 6, 30));

        assertEquals(2000.0, targetThroughFebruary, 0.01);
        assertEquals(6000.0, targetThroughJune, 0.01);
    }

    @Test
    void recalculateMemberFromCollections_replaysFromSingleCollection() {
        TontineMember member = buildMember(LocalDate.of(year, 1, 1), 1000.0);

        var collection = new com.optimize.elykia.core.entity.tontine.TontineCollection();
        collection.setAmount(31000.0);
        collection.setCollectionDate(LocalDate.of(year, 2, 28).atStartOfDay());
        collection.setState(com.optimize.common.entities.enums.State.ENABLED);
        collection.setTontineMember(member);

        policy.recalculateMemberFromCollections(member, java.util.List.of(collection));

        assertEquals(2000.0, member.getSocietyShare(), 0.01);
        assertEquals(31000.0, member.getTotalContribution(), 0.01);
        assertEquals(2000.0, collection.getSocietyShareAmount(), 0.01);
    }

    private TontineMember buildMember(LocalDate sessionStart, double dailyAmount) {
        TontineSession session = new TontineSession();
        session.setId(1L);
        session.setYear(sessionStart.getYear());
        session.setStartDate(sessionStart);
        session.setEndDate(LocalDate.of(sessionStart.getYear(), 11, 30));
        session.setStatus(TontineSessionStatus.ACTIVE);

        TontineMember member = new TontineMember();
        member.setTontineSession(session);
        member.setAmount(dailyAmount);
        member.setSocietyShare(0.0);
        member.setTotalContribution(0.0);
        member.setAmountHistory(new ArrayList<>());
        member.setRegistrationDate(LocalDateTime.of(sessionStart, java.time.LocalTime.NOON));
        return member;
    }
}
