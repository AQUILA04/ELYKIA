package com.optimize.elykia.core.service.tontine.allocation;

import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistory;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

class TontineAmountHistoryHelperTest {

    private final TontineAmountHistoryHelper helper =
            new TontineAmountHistoryHelper(mock(ParameterService.class));

    @Test
    void dailyAmountFollowsThePeriodInForceAtMonthEnd() {
        List<TontineMemberAmountHistory> history = List.of(
                entry(300d, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 10, 31)),
                entry(1000d, LocalDate.of(2026, 11, 1), null));

        assertEquals(300d, helper.getDailyAmountForMonth(1000d, history, YearMonth.of(2026, 9)));
        assertEquals(300d, helper.getDailyAmountForMonth(1000d, history, YearMonth.of(2026, 10)));
        assertEquals(1000d, helper.getDailyAmountForMonth(1000d, history, YearMonth.of(2026, 11)));
    }

    @Test
    void dailyAmountUsesTheStakeActiveOnTheLastDayWhenTheChangeIsMidMonth() {
        List<TontineMemberAmountHistory> history = List.of(
                entry(300d, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 10, 14)),
                entry(1000d, LocalDate.of(2026, 10, 15), null));

        assertEquals(300d, helper.getDailyAmountForMonth(1000d, history, YearMonth.of(2026, 9)));
        assertEquals(1000d, helper.getDailyAmountForMonth(1000d, history, YearMonth.of(2026, 10)));
    }

    @Test
    void dailyAmountFallsBackToTheCurrentStakeWhenHistoryIsEmpty() {
        assertEquals(1000d, helper.getDailyAmountForMonth(1000d, List.of(), YearMonth.of(2026, 9)));
        assertEquals(1000d, helper.getDailyAmountForMonth(1000d, null, YearMonth.of(2026, 9)));
    }

    @Test
    void memberOverloadReadsTheExistingCollection() {
        TontineMember member = new TontineMember();
        member.setAmount(1000d);
        member.getAmountHistory().add(entry(300d, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 10, 31)));
        member.getAmountHistory().add(entry(1000d, LocalDate.of(2026, 11, 1), null));

        assertEquals(300d, helper.getDailyAmountForMonth(member, YearMonth.of(2026, 10)));
        assertEquals(1000d, helper.getDailyAmountForMonth(member, YearMonth.of(2026, 11)));
    }

    private static TontineMemberAmountHistory entry(double amount, LocalDate start, LocalDate end) {
        TontineMemberAmountHistory history = new TontineMemberAmountHistory();
        history.setAmount(amount);
        history.setStartDate(start);
        history.setEndDate(end);
        return history;
    }
}
