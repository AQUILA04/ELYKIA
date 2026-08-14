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
class V2TontineAllocationPolicyTest {

    @Mock
    private ParameterService parameterService;

    private V2TontineAllocationPolicy policy;
    private int year;

    @BeforeEach
    void setUp() {
        TontineAmountHistoryHelper helper = new TontineAmountHistoryHelper(parameterService);
        policy = new V2TontineAllocationPolicy(helper);
        year = LocalDate.now().getYear();
        lenient().when(parameterService.isEnabled(any())).thenReturn(false);
    }

    @Test
    void recalculate_onlyChargesSocietyShareForMonthsWithCollections() {
        TontineMember member = buildMember(LocalDate.of(year, 2, 1), 1000.0);
        List<TontineCollection> collections = List.of(
                collection(member, LocalDate.of(year, 3, 15), 5000.0),
                collection(member, LocalDate.of(year, 5, 10), 5000.0));

        policy.recalculateMemberFromCollections(member, collections);

        assertEquals(2000.0, member.getSocietyShare(), 0.01);
        assertEquals(10000.0, member.getTotalContribution(), 0.01);
        assertEquals(0, member.getValidatedMonths());
        assertEquals(4, member.getCurrentMonthDays());
    }

    @Test
    void recalculate_catchupOpensPastMonthSocietyShare() {
        TontineMember member = buildMember(LocalDate.of(year, 2, 1), 1000.0);
        List<TontineCollection> collections = List.of(
                collection(member, LocalDate.of(year, 3, 15), 5000.0),
                collection(member, LocalDate.of(year, 2, 20), 3000.0));

        policy.recalculateMemberFromCollections(member, collections);

        assertEquals(2000.0, member.getSocietyShare(), 0.01);
    }

    @Test
    void recalculate_allowsMoreThan31DaysInSameMonthWithoutAdvanceFlag() {
        TontineMember member = buildMember(LocalDate.of(year, 2, 1), 1000.0);
        List<TontineCollection> collections = List.of(
                collection(member, LocalDate.of(year, 3, 1), 40000.0));

        policy.recalculateMemberFromCollections(member, collections);

        assertEquals(1, member.getValidatedMonths());
        assertEquals(39, member.getCurrentMonthDays());
    }

    @Test
    void recalculate_advanceToNextMonthAfter31Days() {
        TontineMember member = buildMember(LocalDate.of(year, 2, 1), 1000.0);
        TontineCollection first = collection(member, LocalDate.of(year, 3, 1), 32000.0);
        TontineCollection second = collection(member, LocalDate.of(year, 3, 20), 5000.0);
        second.setAdvanceToNextMonth(true);
        List<TontineCollection> collections = List.of(first, second);

        policy.recalculateMemberFromCollections(member, collections);

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
}
