package com.optimize.elykia.core.service.tontine.allocation;

import com.optimize.common.entities.util.TontineParameterConstant;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistory;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TontineProjectedBalanceCalculatorTest {

    private final ParameterService parameterService = mock(ParameterService.class);
    private final TontineAmountHistoryHelper helper = new TontineAmountHistoryHelper(parameterService);
    private final TontineProjectedBalanceCalculator calculator = new TontineProjectedBalanceCalculator(helper);

    @BeforeEach
    void setUp() {
        when(parameterService.isEnabled(TontineParameterConstant.USE_MEMBER_REGISTRATION_DATE_FOR_SHARE))
                .thenReturn(false);
    }

    @Test
    void constantStakeOverTenMonthsIsThirtyThousand() {
        TontineMember member = member(100d, TontineSessionStatus.ACTIVE, LocalDate.of(2026, 2, 1));
        member.getAmountHistory().add(history(100d, LocalDate.of(2026, 2, 1), null));

        assertEquals(30_000d, calculator.project(member, LocalDate.of(2026, 6, 15)));
    }

    @Test
    void variableStakeUsesHistoryThenCurrentStakeForTheRest() {
        TontineMember member = member(200d, TontineSessionStatus.ACTIVE, LocalDate.of(2026, 2, 1));
        member.getAmountHistory().add(history(100d, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 5, 31)));
        member.getAmountHistory().add(history(200d, LocalDate.of(2026, 6, 1), null));

        assertEquals(48_000d, calculator.project(member, LocalDate.of(2026, 6, 15)));
    }

    @Test
    void closedSessionWithoutHistoryUsesTheCurrentStake() {
        TontineMember member = member(100d, TontineSessionStatus.CLOSED, LocalDate.of(2026, 2, 1));

        assertEquals(30_000d, calculator.project(member, LocalDate.of(2026, 12, 1)));
    }

    @Test
    void closedSessionDoesNotInventAStakeForMonthsWithoutHistory() {
        TontineMember member = member(200d, TontineSessionStatus.CLOSED, LocalDate.of(2026, 2, 1));
        member.getAmountHistory().add(history(100d, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 6, 30)));

        assertEquals(15_000d, calculator.project(member, LocalDate.of(2026, 12, 1)));
    }

    @Test
    void openSessionKeepsTheCurrentStakeForTheRestWhenHistoryStops() {
        TontineMember member = member(200d, TontineSessionStatus.ACTIVE, LocalDate.of(2026, 2, 1));
        member.getAmountHistory().add(history(100d, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 6, 30)));

        assertEquals(45_000d, calculator.project(member, LocalDate.of(2026, 6, 15)));
    }

    @Test
    void lateAdhesionCountsOnlyTheRemainingMonths() {
        when(parameterService.isEnabled(TontineParameterConstant.USE_MEMBER_REGISTRATION_DATE_FOR_SHARE))
                .thenReturn(true);
        TontineMember member = member(100d, TontineSessionStatus.ACTIVE, LocalDate.of(2026, 8, 1));
        member.setRegistrationDate(LocalDateTime.of(2026, 8, 1, 8, 0));
        member.getAmountHistory().add(history(100d, LocalDate.of(2026, 8, 1), null));

        assertEquals(12_000d, calculator.project(member, LocalDate.of(2026, 8, 20)));
    }

    @Test
    void midMonthStakeChangePricesTheWholeMonthAtMonthEnd() {
        TontineMember member = member(1000d, TontineSessionStatus.ACTIVE, LocalDate.of(2026, 2, 1));
        member.getAmountHistory().add(history(300d, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 10, 14)));
        member.getAmountHistory().add(history(1000d, LocalDate.of(2026, 10, 15), null));

        assertEquals(132_000d, calculator.project(member, LocalDate.of(2026, 10, 20)));
    }

    @Test
    void zeroStakeMonthAddsNothing() {
        TontineMember member = member(0d, TontineSessionStatus.CLOSED, LocalDate.of(2026, 2, 1));
        member.getAmountHistory().add(history(0d, LocalDate.of(2026, 2, 1), null));

        assertEquals(0d, calculator.project(member, LocalDate.of(2026, 12, 1)));
    }

    @Test
    void orderAfterTheSessionUsesTheKnownHistoryOnly() {
        TontineMember member = member(100d, TontineSessionStatus.ACTIVE, LocalDate.of(2026, 2, 1));
        member.getAmountHistory().add(history(100d, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 11, 30)));

        assertEquals(30_000d, calculator.project(member, LocalDate.of(2026, 12, 5)));
    }

    @Test
    void equalityIsAllowedAndAMillimeOverIsNot() {
        assertFalse(TontineProjectedBalanceCalculator.exceeds(30_000d, 30_000d));
        assertFalse(TontineProjectedBalanceCalculator.exceeds(30_000.001d, 30_000d));
        assertTrue(TontineProjectedBalanceCalculator.exceeds(30_000.02d, 30_000d));
    }

    private static TontineMember member(double amount, TontineSessionStatus status, LocalDate adhesion) {
        TontineSession session = new TontineSession();
        session.setYear(2026);
        session.setStartDate(LocalDate.of(2026, 2, 1));
        session.setEndDate(LocalDate.of(2026, 11, 30));
        session.setStatus(status);

        TontineMember member = new TontineMember();
        member.setAmount(amount);
        member.setTontineSession(session);
        member.setRegistrationDate(adhesion.atStartOfDay());
        return member;
    }

    private static TontineMemberAmountHistory history(double amount, LocalDate start, LocalDate end) {
        TontineMemberAmountHistory entry = new TontineMemberAmountHistory();
        entry.setAmount(amount);
        entry.setStartDate(start);
        entry.setEndDate(end);
        return entry;
    }
}
