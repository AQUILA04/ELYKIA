package com.optimize.elykia.core.service.carnet;

import com.optimize.common.entities.enums.State;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.carnet.CarnetEcartBulkResultDto;
import com.optimize.elykia.core.entity.carnet.CarnetEcartDecision;
import com.optimize.elykia.core.entity.debt.DebtDocument;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControl;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControlLine;
import com.optimize.elykia.core.enumaration.CarnetEcartDirection;
import com.optimize.elykia.core.enumaration.CarnetEcartStatus;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.service.tontine.TontineService.FieldControlTontinePosting;
import com.optimize.elykia.core.repository.CarnetEcartDecisionRepository;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.TontineMemberFieldControlRepository;
import com.optimize.elykia.core.service.debt.DebtService;
import com.optimize.elykia.core.service.sale.CreditTimelineService;
import com.optimize.elykia.core.service.tontine.TontineService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CarnetEcartDecisionServiceTest {

    @Mock private CarnetEcartDecisionRepository decisionRepository;
    @Mock private CreditFieldControlRepository creditFieldControlRepository;
    @Mock private TontineMemberFieldControlRepository tontineFieldControlRepository;
    @Mock private CreditTimelineService creditTimelineService;
    @Mock private TontineService tontineService;
    @Mock private DebtService debtService;
    @Mock private UserService userService;
    @Mock private PlatformTransactionManager transactionManager;

    private CarnetEcartDecisionService service;

    @BeforeEach
    void setUp() {
        service = new CarnetEcartDecisionService(
                decisionRepository,
                creditFieldControlRepository,
                tontineFieldControlRepository,
                creditTimelineService,
                tontineService,
                debtService,
                userService,
                transactionManager);
        User user = org.mockito.Mockito.mock(User.class);
        when(user.getUsername()).thenReturn("com");
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        when(user.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(user.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(user.is(UserProfilConstant.SU)).thenReturn(false);
        when(userService.getCurrentUser()).thenReturn(user);
        when(transactionManager.getTransaction(any(TransactionDefinition.class)))
                .thenReturn(new SimpleTransactionStatus());
    }

    @Test
    void accept_inverseCreditIsIgnoredWithoutMiseOrShortage() {
        stubCreditControl(-500d);

        CarnetEcartBulkResultDto result = service.accept(List.of("CREDIT|7"));

        assertEquals(1, result.getIgnored().size());
        assertTrue(result.getSucceeded().isEmpty());
        verify(creditTimelineService, never()).postFieldControlRecovery(any(), any(Double.class), any());
        verify(debtService, never()).createFieldControlShortage(any(), any(), any(Double.class), any(), any(), any());
        verify(decisionRepository, never()).save(any());
    }

    @Test
    void accept_tontineRealignsExcessMonthAndShortsOnlyTheNet() {
        stubTontineControl();
        when(tontineService.reduceFieldControlExcess(9L, "com", 2026, 8, 31_000d)).thenReturn(31_000d);
        when(tontineService.recordFieldControlCollection(
                eq(9L), eq(186_000d), any(LocalDate.class), eq("com"), eq("FC-TONTINE-1")))
                .thenReturn(new FieldControlTontinePosting(
                        40L, "FC-TONTINE-1", "com", "Awa", LocalDate.of(2026, 7, 31), 186_000d, false));
        when(decisionRepository.save(any())).thenAnswer(invocation -> {
            CarnetEcartDecision decision = invocation.getArgument(0);
            if (decision.getId() == null) {
                decision.setId(100L);
            }
            return decision;
        });
        DebtDocument debt = new DebtDocument();
        debt.setId(50L);
        when(debtService.createFieldControlShortage(
                eq("com"), any(LocalDate.class), eq(186_000d), eq("TONTINE"), eq(100L), anyString()))
                .thenReturn(debt);

        CarnetEcartBulkResultDto result = service.accept(List.of("TONTINE|4|com"));

        assertEquals(1, result.getSucceeded().size());
        assertEquals(186_000d, result.getSucceeded().get(0).getAmount());
        assertTrue(result.getIgnored().isEmpty());
        verify(tontineService).reduceFieldControlExcess(9L, "com", 2026, 8, 31_000d);
        verify(debtService).createFieldControlShortage(
                eq("com"), any(LocalDate.class), eq(186_000d), eq("TONTINE"), eq(100L), anyString());
        verify(tontineService).publishFieldControlCollection(any());
        verify(tontineService, never()).alignAdhesionForFieldControl(anyLong(), any());
        ArgumentCaptor<CarnetEcartDecision> captor = ArgumentCaptor.forClass(CarnetEcartDecision.class);
        verify(decisionRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        assertTrue(captor.getAllValues().stream()
                .anyMatch(decision -> decision.getDirection() == CarnetEcartDirection.SYSTEM_ABOVE_NOTEBOOK
                        && decision.getStatus() == CarnetEcartStatus.ACCEPTED));
    }

    @Test
    void accept_tontineBackdatesAdhesionAndAppliesDeclaredStake() {
        TontineMember member = new TontineMember();
        member.setId(9L);
        com.optimize.elykia.core.entity.tontine.TontineSession session =
                new com.optimize.elykia.core.entity.tontine.TontineSession();
        session.setStartDate(LocalDate.of(2026, 2, 1));
        session.setStatus(com.optimize.elykia.core.enumaration.TontineSessionStatus.CLOSED);
        member.setTontineSession(session);
        member.setRegistrationDate(LocalDate.of(2026, 10, 1).atStartOfDay());
        TontineMemberFieldControlLine february = line(1L, 2026, 2, 0d, 9_300d);
        february.setDeclaredDailyAmount(300d);
        TontineMemberFieldControl control = controlWith(february);
        control.setTontineMember(member);
        when(tontineFieldControlRepository.findById(4L)).thenReturn(Optional.of(control));
        when(tontineFieldControlRepository.findFirstByTontineMember_idAndStateOrderByObservedAtDesc(9L, State.ENABLED))
                .thenReturn(Optional.of(control));
        when(decisionRepository.findByTontineLineId(anyLong())).thenReturn(Optional.empty());
        when(tontineService.participationStart(member)).thenReturn(LocalDate.of(2026, 10, 1));
        when(tontineService.recordFieldControlCollection(
                eq(9L), eq(9_300d), any(LocalDate.class), eq("com"), eq("FC-TONTINE-1")))
                .thenReturn(new FieldControlTontinePosting(
                        41L, "FC-TONTINE-1", "com", "Awa", LocalDate.of(2026, 2, 28), 9_300d, false));
        when(decisionRepository.save(any())).thenAnswer(invocation -> {
            CarnetEcartDecision decision = invocation.getArgument(0);
            decision.setId(101L);
            return decision;
        });
        DebtDocument debt = new DebtDocument();
        debt.setId(51L);
        when(debtService.createFieldControlShortage(
                eq("com"), any(LocalDate.class), eq(9_300d), eq("TONTINE"), eq(101L), anyString()))
                .thenReturn(debt);

        CarnetEcartBulkResultDto result = service.accept(List.of("TONTINE|4|com"));

        assertEquals(1, result.getSucceeded().size());
        assertTrue(result.getSucceeded().get(0).getMessage().contains("01/02/2026"));
        verify(tontineService).alignAdhesionForFieldControl(9L, LocalDate.of(2026, 2, 1));
        verify(tontineService).applyFieldControlMonthStake(9L, LocalDate.of(2026, 2, 1), 300d);
    }

    @Test
    void accept_tontineInverseOnlyCancelsTheMonthWithoutShortage() {
        TontineMemberFieldControl control = controlWith(line(2L, 2026, 8, 31_000d, 0d));
        when(tontineFieldControlRepository.findById(4L)).thenReturn(Optional.of(control));
        when(tontineFieldControlRepository.findFirstByTontineMember_idAndStateOrderByObservedAtDesc(9L, State.ENABLED))
                .thenReturn(Optional.of(control));
        when(decisionRepository.findByTontineLineId(anyLong())).thenReturn(Optional.empty());
        when(tontineService.reduceFieldControlExcess(9L, "com", 2026, 8, 31_000d)).thenReturn(31_000d);
        when(decisionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        CarnetEcartBulkResultDto result = service.accept(List.of("TONTINE|4|com"));

        assertEquals(1, result.getSucceeded().size());
        assertEquals(0d, result.getSucceeded().get(0).getAmount());
        verify(tontineService, never()).recordFieldControlCollection(anyLong(), anyDouble(), any(), any(), any());
        verify(debtService, never()).createFieldControlShortage(any(), any(), anyDouble(), any(), any(), any());
    }

    @Test
    void reject_inverseCreditStoresTheDecisionWithoutMise() {
        stubCreditControl(-500d);
        when(decisionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        CarnetEcartBulkResultDto result = service.reject(List.of("CREDIT|7"), "Le carnet n'était pas à jour");

        assertEquals(1, result.getSucceeded().size());
        ArgumentCaptor<com.optimize.elykia.core.entity.carnet.CarnetEcartDecision> captor =
                ArgumentCaptor.forClass(com.optimize.elykia.core.entity.carnet.CarnetEcartDecision.class);
        verify(decisionRepository).save(captor.capture());
        assertEquals(CarnetEcartStatus.REJECTED, captor.getValue().getStatus());
        verify(creditTimelineService, never()).postFieldControlRecovery(any(), any(Double.class), any());
        verify(debtService, never()).createFieldControlShortage(any(), any(), any(Double.class), any(), any(), any());
    }

    private void stubTontineControl() {
        TontineMemberFieldControl control = controlWith(
                line(1L, 2026, 7, 0d, 186_000d),
                line(2L, 2026, 8, 31_000d, 0d));
        when(tontineFieldControlRepository.findById(4L)).thenReturn(Optional.of(control));
        when(tontineFieldControlRepository.findFirstByTontineMember_idAndStateOrderByObservedAtDesc(9L, State.ENABLED))
                .thenReturn(Optional.of(control));
        when(decisionRepository.findByTontineLineId(anyLong())).thenReturn(Optional.empty());
    }

    private static TontineMemberFieldControl controlWith(TontineMemberFieldControlLine... lines) {
        TontineMember member = new TontineMember();
        member.setId(9L);
        TontineMemberFieldControl control = new TontineMemberFieldControl();
        control.setId(4L);
        control.setTontineMember(member);
        control.setLines(new java.util.ArrayList<>(List.of(lines)));
        return control;
    }

    private static TontineMemberFieldControlLine line(
            Long id, int year, int month, double system, double notebook) {
        TontineMemberFieldControlLine line = new TontineMemberFieldControlLine();
        line.setId(id);
        line.setYear(year);
        line.setMonth(month);
        line.setCommercialUsername("com");
        line.setSystemAmount(system);
        line.setNotebookAmount(notebook);
        line.setDifferenceAmount(notebook - system);
        return line;
    }

    private void stubCreditControl(double difference) {
        Credit credit = new Credit();
        credit.setId(3L);
        credit.setCollector("com");
        credit.setReference("CR-3");
        CreditFieldControl control = new CreditFieldControl();
        control.setId(7L);
        control.setCredit(credit);
        control.setDifferenceAmount(difference);
        control.setSystemTotalAmountPaid(1000d);
        control.setNotebookTotalAmount(1000d + difference);
        control.setStatus(FieldControlStatus.ECART);
        when(creditFieldControlRepository.findById(7L)).thenReturn(Optional.of(control));
        when(creditFieldControlRepository.findFirstByCredit_idAndStateOrderByObservedAtDesc(3L, State.ENABLED))
                .thenReturn(Optional.of(control));
        when(decisionRepository.findByCreditFieldControlId(7L)).thenReturn(Optional.empty());
    }
}
