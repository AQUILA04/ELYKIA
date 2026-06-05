package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.TontineCollectionDto;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.service.tontine.TontineService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineCollectionAllocationTest {

    @Mock
    private TontineMemberRepository memberRepository;
    @Mock
    private TontineSessionRepository sessionRepository;
    @Mock
    private TontineCollectionRepository collectionRepository;
    @Mock
    private ClientService clientService;
    @Mock
    private UserService userService;
    @Mock
    private ParameterService parameterService;

    private TontineService tontineService;

    @BeforeEach
    void setUp() {
        tontineService = new TontineService(
                memberRepository,
                sessionRepository,
                collectionRepository,
                clientService,
                userService,
                parameterService,
                null);
        lenient().when(parameterService.isEnabled("USE_MEMBER_REGISTRATION_DATE_FOR_SHARE")).thenReturn(false);
    }

    @Test
    void calculateTargetSocietyShare_usesAllocationCutoff_notToday() throws Exception {
        int year = LocalDate.now().getYear();
        TontineMember member = buildMember(LocalDate.of(year, 1, 1), 1000.0);
        member.setSocietyShare(1000.0);

        double targetThroughFebruary = invokeCalculateTarget(member, LocalDate.of(year, 2, 28));
        double targetThroughJune = invokeCalculateTarget(member, LocalDate.of(year, 6, 30));

        assertEquals(2000.0, targetThroughFebruary, 0.01);
        assertEquals(6000.0, targetThroughJune, 0.01);
    }

    @Test
    void processCollectionAllocation_withPastDate_limitsSocietyShareIncrease() throws Exception {
        int year = LocalDate.now().getYear();
        TontineMember member = buildMember(LocalDate.of(year, 1, 1), 1000.0);
        member.setSocietyShare(1000.0);
        member.setTotalContribution(31000.0);

        invokeProcessAllocation(member, 31000.0, LocalDate.of(year, 2, 28));

        assertEquals(2000.0, member.getSocietyShare(), 0.01);
        assertEquals(62000.0, member.getTotalContribution(), 0.01);
    }

    @Test
    void processCollectionAllocation_withTodayDate_increasesSocietyShareThroughCurrentMonth() throws Exception {
        int year = LocalDate.now().getYear();
        TontineMember member = buildMember(LocalDate.of(year, 1, 1), 1000.0);
        member.setSocietyShare(1000.0);
        member.setTotalContribution(31000.0);

        LocalDate today = LocalDate.now();
        invokeProcessAllocation(member, 31000.0, today);

        double expectedTarget = invokeCalculateTarget(member, today);
        double expectedSocietyIncrease = Math.min(31000.0, expectedTarget - 1000.0);
        assertEquals(1000.0 + expectedSocietyIncrease, member.getSocietyShare(), 0.01);
    }

    @Test
    void validateCatchupCollectionDate_rejectsOnOrAfterToday() throws Exception {
        TontineSession session = buildSession();
        TontineMember member = buildMember(LocalDate.of(LocalDate.now().getYear(), 1, 1), 1000.0);

        Method validate = TontineService.class.getDeclaredMethod(
                "validateCatchupCollectionDate", TontineMember.class, TontineSession.class, LocalDate.class);
        validate.setAccessible(true);

        assertThrows(CustomValidationException.class, () -> {
            try {
                validate.invoke(tontineService, member, session, LocalDate.now());
            } catch (java.lang.reflect.InvocationTargetException e) {
                throw e.getCause();
            }
        });

        assertThrows(CustomValidationException.class, () -> {
            try {
                validate.invoke(tontineService, member, session, LocalDate.now().plusDays(1));
            } catch (java.lang.reflect.InvocationTargetException e) {
                throw e.getCause();
            }
        });
    }

    private TontineMember buildMember(LocalDate sessionStart, double dailyAmount) {
        TontineSession session = buildSession();
        session.setStartDate(sessionStart);

        TontineMember member = new TontineMember();
        member.setTontineSession(session);
        member.setAmount(dailyAmount);
        member.setSocietyShare(0.0);
        member.setTotalContribution(0.0);
        member.setAmountHistory(new ArrayList<>());
        member.setRegistrationDate(LocalDateTime.of(sessionStart, java.time.LocalTime.NOON));
        return member;
    }

    private TontineSession buildSession() {
        TontineSession session = new TontineSession();
        session.setId(1L);
        session.setYear(LocalDate.now().getYear());
        session.setStartDate(LocalDate.of(LocalDate.now().getYear(), 1, 1));
        session.setEndDate(LocalDate.of(LocalDate.now().getYear(), 11, 30));
        session.setStatus(TontineSessionStatus.ACTIVE);
        return session;
    }

    private double invokeCalculateTarget(TontineMember member, LocalDate upToDate) throws Exception {
        Method method = TontineService.class.getDeclaredMethod(
                "calculateTargetSocietyShare", TontineMember.class, LocalDate.class);
        method.setAccessible(true);
        return (double) method.invoke(tontineService, member, upToDate);
    }

    private void invokeProcessAllocation(TontineMember member, double amount, LocalDate allocationDate)
            throws Exception {
        Method method = TontineService.class.getDeclaredMethod(
                "processCollectionAllocation", TontineMember.class, Double.class, LocalDate.class);
        method.setAccessible(true);
        method.invoke(tontineService, member, amount, allocationDate);
    }
}
