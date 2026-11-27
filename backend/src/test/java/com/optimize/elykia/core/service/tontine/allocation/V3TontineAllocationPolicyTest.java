package com.optimize.elykia.core.service.tontine.allocation;

import com.optimize.common.entities.enums.State;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistory;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class V3TontineAllocationPolicyTest {

    @Mock
    private ParameterService parameterService;

    private V3TontineAllocationPolicy policy;
    private int year;

    @BeforeEach
    void setUp() {
        TontineAmountHistoryHelper helper = new TontineAmountHistoryHelper(parameterService);
        policy = new V3TontineAllocationPolicy(helper);
        year = LocalDate.now().getYear();
        lenient().when(parameterService.isEnabled(any())).thenReturn(false);
    }

    @Test
    void firstDayOfMonthChargesOneSocietyShare() {
        TontineMember member = buildMember(LocalDate.of(year, 2, 1), 1000.0);
        policy.recalculateMemberFromCollections(member, List.of(collection(member, LocalDate.of(year, 3, 5), 1000.0)));
        assertEquals(1000.0, member.getSocietyShare(), 0.01);
        assertEquals(0.0, member.getAvailableContribution(), 0.01);
    }

    @Test
    void startedMonthKeepsItsShareEvenIfNot31Days() {
        TontineMember member = buildMember(LocalDate.of(year, 2, 1), 1000.0);
        policy.recalculateMemberFromCollections(member, List.of(collection(member, LocalDate.of(year, 3, 5), 10000.0)));
        assertEquals(1000.0, member.getSocietyShare(), 0.01);
    }

    @Test
    void thresholds31_32_62_63() {
        assertEquals(1, V3TontineAllocationPolicy.societyBlocks(31000.0, 1000.0));
        assertEquals(2, V3TontineAllocationPolicy.societyBlocks(32000.0, 1000.0));
        assertEquals(2, V3TontineAllocationPolicy.societyBlocks(62000.0, 1000.0));
        assertEquals(3, V3TontineAllocationPolicy.societyBlocks(63000.0, 1000.0));
        assertEquals(0, V3TontineAllocationPolicy.societyBlocks(0.0, 1000.0));
    }

    @Test
    void ninetyDaysInOneMonthChargesThreeShares() {
        TontineMember member = buildMember(LocalDate.of(year, 2, 1), 1000.0);
        policy.recalculateMemberFromCollections(member, List.of(collection(member, LocalDate.of(year, 9, 1), 90000.0)));
        assertEquals(3000.0, member.getSocietyShare(), 0.01);
        assertEquals(87000.0, member.getAvailableContribution(), 0.01);
    }

    @Test
    void shareIsAddedWhenLaterCollectionCrossesTheBlock() {
        TontineMember member = buildMember(LocalDate.of(year, 2, 1), 1000.0);
        TontineCollection first = collection(member, LocalDate.of(year, 3, 1), 31000.0);
        TontineCollection second = collection(member, LocalDate.of(year, 3, 20), 1000.0);
        policy.recalculateMemberFromCollections(member, List.of(first, second));
        assertEquals(2000.0, member.getSocietyShare(), 0.01);
        assertEquals(1000.0, first.getSocietyShareAmount(), 0.01);
        assertEquals(1000.0, second.getSocietyShareAmount(), 0.01);
    }

    @Test
    void noCapOnNumberOfShares() {
        TontineMember member = buildMember(LocalDate.of(year, 1, 1), 1000.0);
        List<TontineCollection> collections = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            collections.add(collection(member, LocalDate.of(year, m, 10), 1000.0));
        }
        policy.recalculateMemberFromCollections(member, collections);
        assertEquals(12000.0, member.getSocietyShare(), 0.01);
    }

    @Test
    void advanceToNextMonthOverflowsAfter31Days() {
        TontineMember member = buildMember(LocalDate.of(year, 2, 1), 1000.0);
        TontineCollection first = collection(member, LocalDate.of(year, 3, 1), 31000.0);
        TontineCollection second = collection(member, LocalDate.of(year, 3, 20), 5000.0);
        second.setAdvanceToNextMonth(true);
        policy.recalculateMemberFromCollections(member, List.of(first, second));
        assertEquals(2000.0, member.getSocietyShare(), 0.01);
        assertEquals(YearMonth.of(year, 4).atDay(1), second.getContributionMonth());
    }

    private TontineCollection collection(TontineMember member, LocalDate date, double amount) {
        TontineCollection collection = new TontineCollection();
        collection.setId((long) (date.getDayOfMonth() + date.getMonthValue() * 100L));
        collection.setTontineMember(member);
        collection.setAmount(amount);
        collection.setCollectionDate(date.atStartOfDay());
        collection.setState(State.ENABLED);
        collection.setAdvanceToNextMonth(false);
        collection.setContributionMonth(date.withDayOfMonth(1));
        return collection;
    }

    private TontineMember buildMember(LocalDate sessionStart, double dailyAmount) {
        TontineSession session = new TontineSession();
        session.setId(1L);
        session.setYear(sessionStart.getYear());
        session.setStartDate(sessionStart);
        session.setEndDate(LocalDate.of(sessionStart.getYear(), 11, 30));
        session.setStatus(TontineSessionStatus.ACTIVE);

        TontineMember member = new TontineMember();
        member.setId(1L);
        member.setTontineSession(session);
        member.setAmount(dailyAmount);
        member.setAmountHistory(new ArrayList<>());
        member.setRegistrationDate(LocalDateTime.of(sessionStart, java.time.LocalTime.NOON));

        TontineMemberAmountHistory history = new TontineMemberAmountHistory();
        history.setTontineMember(member);
        history.setAmount(dailyAmount);
        history.setStartDate(sessionStart);
        member.getAmountHistory().add(history);
        return member;
    }

    @Test
    void deliveryCollectionsAreExemptFromSocietyShareInV3EvenInActiveSession() {
        V3TontineAllocationPolicy policy = new V3TontineAllocationPolicy(
                new TontineAmountHistoryHelper(org.mockito.Mockito.mock(
                        com.optimize.common.securities.service.ParameterService.class)));
        com.optimize.elykia.core.entity.tontine.TontineMember member =
                new com.optimize.elykia.core.entity.tontine.TontineMember();
        member.setAmount(100d);

        com.optimize.elykia.core.entity.tontine.TontineCollection regular =
                new com.optimize.elykia.core.entity.tontine.TontineCollection();
        regular.setAmount(100d);
        regular.setCollectionDate(java.time.LocalDateTime.of(2026, 3, 2, 10, 0));
        com.optimize.elykia.core.entity.tontine.TontineCollection delivery =
                new com.optimize.elykia.core.entity.tontine.TontineCollection();
        delivery.setAmount(5_000d);
        delivery.setIsDeliveryCollection(true);
        delivery.setCollectionDate(java.time.LocalDateTime.of(2026, 3, 3, 10, 0));

        policy.recalculateMemberFromCollections(member, java.util.List.of(regular, delivery));

        org.junit.jupiter.api.Assertions.assertEquals(100d, member.getSocietyShare());
        org.junit.jupiter.api.Assertions.assertEquals(5_100d, member.getTotalContribution());
        org.junit.jupiter.api.Assertions.assertEquals(5_000d, member.getAvailableContribution());
        org.junit.jupiter.api.Assertions.assertEquals(0d, delivery.getSocietyShareAmount());
    }

    @Test
    void societyShareOverrideSurvivesNewCollectionsAndKeepsComputedValue() {
        TontineMember member = buildMember(LocalDate.of(year, 2, 1), 1000.0);
        member.setSocietyShareOverride(3000.0);
        policy.recalculateMemberFromCollections(member, new ArrayList<>(List.of(
                collection(member, LocalDate.of(year, 3, 5), 10000.0))));
        assertEquals(1000.0, member.getSocietyShareComputed(), 0.01);
        assertEquals(3000.0, member.getSocietyShare(), 0.01);
        assertEquals(7000.0, member.getAvailableContribution(), 0.01);

        // Une collecte de plus ne change pas une part déjà saisie (montant dû sur toute l'année).
        policy.recalculateMemberFromCollections(member, new ArrayList<>(List.of(
                collection(member, LocalDate.of(year, 3, 5), 10000.0),
                collection(member, LocalDate.of(year, 4, 6), 5000.0))));
        assertEquals(2000.0, member.getSocietyShareComputed(), 0.01);
        assertEquals(3000.0, member.getSocietyShare(), 0.01);
        assertEquals(12000.0, member.getAvailableContribution(), 0.01);
    }

    @Test
    void societyShareOverrideIsCappedAtRegularContributions() {
        TontineMember member = buildMember(LocalDate.of(year, 2, 1), 1000.0);
        member.setSocietyShareOverride(50000.0);
        policy.recalculateMemberFromCollections(member, new ArrayList<>(List.of(
                collection(member, LocalDate.of(year, 3, 5), 10000.0))));
        assertEquals(10000.0, member.getSocietyShare(), 0.01);
        assertEquals(0.0, member.getAvailableContribution(), 0.01);
    }

    @Test
    void societyShareOverrideWithoutCollectionsIsNotApplied() {
        TontineMember member = buildMember(LocalDate.of(year, 2, 1), 1000.0);
        member.setSocietyShareOverride(3000.0);
        policy.recalculateMemberFromCollections(member, new ArrayList<>());
        assertEquals(0.0, member.getSocietyShare(), 0.01);
        assertEquals(0.0, member.getAvailableContribution(), 0.01);
    }

    @Test
    void societyShareOverrideLeavesDeliveryTopUpOutOfTheShare() {
        TontineMember member = buildMember(LocalDate.of(year, 2, 1), 1000.0);
        member.setSocietyShareOverride(2500.0);
        TontineCollection topUp = collection(member, LocalDate.of(year, 4, 2), 4000.0);
        topUp.setIsDeliveryCollection(true);
        policy.recalculateMemberFromCollections(member, new ArrayList<>(List.of(
                collection(member, LocalDate.of(year, 3, 5), 10000.0), topUp)));
        assertEquals(2500.0, member.getSocietyShare(), 0.01);
        assertEquals(11500.0, member.getAvailableContribution(), 0.01);
        assertEquals(14000.0, member.getTotalContribution(), 0.01);
    }
}
