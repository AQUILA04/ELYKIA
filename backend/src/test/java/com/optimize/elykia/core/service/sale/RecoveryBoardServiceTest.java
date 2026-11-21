package com.optimize.elykia.core.service.sale;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.dto.CreditLateDTO;
import com.optimize.elykia.core.dto.carnet.CarnetEcartItemDto;
import com.optimize.elykia.core.dto.sale.RecoveryBoardDto;
import com.optimize.elykia.core.dto.sale.RecoveryManagerActivityDto;
import com.optimize.elykia.core.dto.sale.RecoveryManagerReportSummaryDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;
import com.optimize.elykia.core.enumaration.CarnetEcartStatus;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.enumaration.LateType;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.RecoveryFieldDayPlanRepository;
import com.optimize.elykia.core.repository.RecoveryManagerOperationRepository;
import com.optimize.elykia.core.service.CreditLateService;
import com.optimize.elykia.core.service.carnet.CarnetEcartDecisionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RecoveryBoardServiceTest {

    @Mock private RecoveryReportAccess access;
    @Mock private RecoveryManagerOperationRepository operationRepository;
    @Mock private RecoveryManagerService recoveryManagerService;
    @Mock private RecoveryManagerActivityService activityService;
    @Mock private CreditLateService creditLateService;
    @Mock private CreditFieldControlRepository creditFieldControlRepository;
    @Mock private CarnetEcartDecisionService ecartService;
    @Mock private RecoveryFieldDayPlanRepository planRepository;
    @Mock private UserRepository userRepository;
    @Mock private ParameterService parameterService;

    private RecoveryBoardService service;
    private final LocalDate today = LocalDate.now();

    @BeforeEach
    void setUp() {
        service = new RecoveryBoardService(access, operationRepository, recoveryManagerService, activityService,
                creditLateService, creditFieldControlRepository, ecartService, planRepository, userRepository,
                parameterService, new ObjectMapper());
        when(recoveryManagerService.getReportSummary(any(), any(), any(), any()))
                .thenReturn(RecoveryManagerReportSummaryDto.builder()
                        .totalAmountCollected(50_000d).totalOperationsCount(3).commercialsCount(2)
                        .remittanceByCommercial(List.of()).build());
        when(activityService.getActivity(any(), any(), any(), any())).thenReturn(activity(10, 100, 5, 50));
        when(operationRepository.sumByDay(any(), any(), any(), any())).thenReturn(List.of());
        when(operationRepository.summarizeByRecoveryManager(any(), any(), any())).thenReturn(List.of());
        when(operationRepository.findLastOperationDateByRecoveryManager(any())).thenReturn(List.of());
        when(planRepository.findByPlanDate(any())).thenReturn(List.of());
        when(ecartService.listPendingForBoard(any())).thenReturn(List.of());
        when(creditLateService.getLateCredits(isNull(), isNull(), isNull())).thenReturn(List.of());
        when(creditFieldControlRepository.findLatestByCreditIds(any())).thenReturn(List.of());
    }

    @Test
    void chefIsAlwaysScopedToHimself() {
        when(access.isSupervisor()).thenReturn(false);
        when(access.resolveRecoveryManager(null)).thenReturn("recov001");

        RecoveryBoardDto board = service.getBoard(today, today, "recov002", null);

        assertEquals(RecoveryBoardDto.SCOPE_MANAGER, board.getScope());
        assertEquals("recov001", board.getRecoveryManagerUsername());
        assertNull(board.getTeam());
        verify(recoveryManagerService).getReportSummary(today, today, "recov001", null);
        verify(userRepository, never())
                .findByUserAccount_userProfil_nameAndUserAccount_activeIsTrueOrderByUserAccount_username(anyString());
    }

    @Test
    void supervisorWithoutManagerGetsAllChefsSideBySide() {
        when(access.isSupervisor()).thenReturn(true);
        User recov001 = user("recov001", "Kossi", "Amah");
        when(userRepository.findByUserAccount_userProfil_nameAndUserAccount_activeIsTrueOrderByUserAccount_username(
                RecoveryBoardService.RECOVERY_MANAGER_PROFILE)).thenReturn(List.of(recov001));
        // recov009 n'a plus le profil mais a des opérations sur la période : il reste affiché.
        when(operationRepository.summarizeByRecoveryManager(eq(today), eq(today), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{"recov001", 2L, 30_000d}, new Object[]{"recov009", 1L, 20_000d}));
        when(operationRepository.findLastOperationDateByRecoveryManager(any()))
                .thenReturn(List.<Object[]>of(new Object[]{"recov001", today}));

        RecoveryBoardDto board = service.getBoard(today, today, "  ", null);

        assertEquals(RecoveryBoardDto.SCOPE_TEAM, board.getScope());
        assertNull(board.getRecoveryManagerUsername());
        assertEquals(List.of("recov001", "recov009"), board.getTeam().stream().map(RecoveryBoardDto.ManagerRow::getUsername).toList());
        assertEquals("Kossi Amah", board.getTeam().get(0).getDisplayName());
        assertEquals(30_000d, board.getTeam().get(0).getCollectedAmount());
        assertEquals(2, board.getTeam().get(0).getOperationsCount());
        // recov009 n'a aucune opération connue : chef inactif.
        assertTrue(board.getAttention().stream().anyMatch(a -> "MANAGER_INACTIVE".equals(a.getType())
                && "recov009".equals(a.getRecoveryManagerUsername())));
        assertTrue(board.getAttention().stream().noneMatch(a -> "MANAGER_INACTIVE".equals(a.getType())
                && "recov001".equals(a.getRecoveryManagerUsername())));
        verify(recoveryManagerService).getReportSummary(today, today, null, null);
    }

    @Test
    void priorityLateKeepsTheTenLargestDelaiDuesAndFlagsNeverControlled() {
        when(access.isSupervisor()).thenReturn(true);
        List<CreditLateDTO> lates = new ArrayList<>();
        for (long id = 1; id <= 12; id++) {
            lates.add(late(id, "COM00" + (id % 2), id * 1_000d, (int) id, LateType.DELAI));
        }
        lates.add(late(99L, "COM001", 999_999d, 3, LateType.ECHEANCE));
        when(creditLateService.getLateCredits(isNull(), isNull(), isNull())).thenReturn(lates);
        CreditFieldControl control = control(12L, FieldControlStatus.CONFORME, today.atStartOfDay().minusDays(2));
        when(creditFieldControlRepository.findLatestByCreditIds(any())).thenReturn(List.of(control));

        RecoveryBoardDto board = service.getBoard(today, today, "recov001", null);

        assertEquals(10, board.getPriorityLate().size());
        assertEquals(12L, board.getPriorityLate().get(0).getCreditId());
        assertEquals("CONFORME", board.getPriorityLate().get(0).getLatestControlStatus());
        assertEquals(3L, board.getPriorityLate().get(9).getCreditId());
        // L'échéance seule n'entre ni dans le dû des retards délai ni dans la liste.
        assertEquals(12, board.getMonthRate().getLateCreditsCount());
        assertEquals(78_000d, board.getMonthRate().getLatePortfolioDue());
        RecoveryBoardDto.Attention never = board.getAttention().stream()
                .filter(a -> "NEVER_CONTROLLED".equals(a.getType())).findFirst().orElseThrow();
        assertEquals(9, never.getCount());
    }

    @Test
    void pendingEcartsOfAChefAreThoseHeObserved() {
        when(access.isSupervisor()).thenReturn(false);
        when(access.resolveRecoveryManager(null)).thenReturn("recov001");
        when(ecartService.listPendingForBoard(null)).thenReturn(List.of(
                ecart("RECOV001", "COM005", 4_000d, 0d),
                ecart("recov001", "COM012", 0d, 1_500d),
                ecart("recov002", "COM005", 9_000d, 0d)));

        RecoveryBoardDto board = service.getBoard(today, today, null, null);

        RecoveryBoardDto.Attention pending = board.getAttention().stream()
                .filter(a -> "PENDING_ECARTS".equals(a.getType())).findFirst().orElseThrow();
        assertEquals(2, pending.getCount());
        assertEquals(5_500d, pending.getAmount());
        assertEquals(List.of("COM005", "COM012"), pending.getCommercials());
    }

    @Test
    void targetsAreProratedOnTheElapsedMonth() {
        RecoveryBoardDto.Targets targets = RecoveryBoardDto.Targets.builder()
                .monthlyRatePercent(10d).coveragePercent(30d).elapsedRatio(0.5d).build();

        List<RecoveryBoardDto.Attention> below = RecoveryBoardService.targetAttention("recov001", 4d, 20d, targets);
        assertEquals(1, below.size());
        assertEquals("RATE_BELOW_TARGET", below.get(0).getType());
        assertEquals(5d, below.get(0).getThreshold());

        // Sans retard délai ni dossier en cours, pas d'alerte d'objectif.
        assertTrue(RecoveryBoardService.targetAttention("recov001", null, null, targets).isEmpty());

        RecoveryBoardDto.Targets none = RecoveryBoardDto.Targets.builder().elapsedRatio(0.5d).build();
        assertTrue(RecoveryBoardService.targetAttention("recov001", 0d, 0d, none).isEmpty());
    }

    @Test
    void readTargetAcceptsPercentagesOnly() {
        when(parameterService.getValue("A")).thenReturn(" 12,5 % ");
        when(parameterService.getValue("B")).thenReturn("abc");
        when(parameterService.getValue("C")).thenReturn("0");
        when(parameterService.getValue("D")).thenReturn(null);
        assertEquals(12.5d, service.readTarget("A"));
        assertNull(service.readTarget("B"));
        assertNull(service.readTarget("C"));
        assertNull(service.readTarget("D"));
    }

    @Test
    void monthComparisonStopsAtTheSameDayOfThePreviousMonth() {
        RecoveryBoardService.MonthWindow window = RecoveryBoardService.MonthWindow.of(LocalDate.of(2026, 3, 31));
        assertEquals(LocalDate.of(2026, 2, 1), window.previousStart());
        assertEquals(LocalDate.of(2026, 2, 28), window.previousEnd());
        assertNull(RecoveryBoardService.change(100d, 0d));
        assertEquals(-25d, RecoveryBoardService.change(75d, 100d));
        assertEquals(1d, RecoveryBoardService.elapsedRatio(YearMonth.of(2026, 3), LocalDate.of(2026, 4, 2)));
    }

    @Test
    void trendCoversThirtyDaysEndingOnThePeriodEnd() {
        when(access.isSupervisor()).thenReturn(true);
        when(operationRepository.sumByDay(any(), eq(today), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{today.minusDays(1), 2L, 7_000d}));

        RecoveryBoardDto board = service.getBoard(today, today, null, null);

        assertEquals(30, board.getTrend().size());
        assertEquals(today, board.getTrend().get(29).getDate());
        assertEquals(7_000d, board.getTrend().get(28).getAmount());
        assertEquals(2, board.getTrend().get(28).getOperationsCount());
        assertEquals(0d, board.getTrend().get(29).getAmount());
    }

    private static RecoveryManagerActivityDto activity(int creditDone, int creditTotal, int tontineDone, int tontineTotal) {
        return RecoveryManagerActivityDto.builder()
                .creditControlsDone(creditDone).creditPortfolioTotal(creditTotal)
                .creditCoveragePercent(creditTotal > 0 ? creditDone * 100 / creditTotal : 0)
                .tontineControlsDone(tontineDone).tontinePortfolioTotal(tontineTotal)
                .tontineCoveragePercent(tontineTotal > 0 ? tontineDone * 100 / tontineTotal : 0)
                .build();
    }

    private static User user(String username, String firstname, String lastname) {
        User user = mock(User.class);
        when(user.getUsername()).thenReturn(username);
        when(user.getFirstname()).thenReturn(firstname);
        when(user.getLastname()).thenReturn(lastname);
        return user;
    }

    private static CreditLateDTO late(Long id, String collector, double due, int days, LateType type) {
        return CreditLateDTO.builder().id(id).reference("CR-" + id).clientName("Client " + id)
                .collector(collector).totalAmountRemaining(due).lateDaysDelai(days).lateType(type).build();
    }

    private static CreditFieldControl control(Long creditId, FieldControlStatus status, java.time.LocalDateTime at) {
        Credit credit = new Credit();
        credit.setId(creditId);
        CreditFieldControl control = new CreditFieldControl();
        control.setCredit(credit);
        control.setStatus(status);
        control.setObservedAt(at);
        control.setObservedBy("recov001");
        return control;
    }

    private static CarnetEcartItemDto ecart(String observer, String commercial, double acceptable, double inverse) {
        return CarnetEcartItemDto.builder().observedBy(observer).commercialUsername(commercial)
                .status(CarnetEcartStatus.PENDING).acceptableAmount(acceptable).pendingInverseAmount(inverse)
                .months(List.of()).build();
    }
}
