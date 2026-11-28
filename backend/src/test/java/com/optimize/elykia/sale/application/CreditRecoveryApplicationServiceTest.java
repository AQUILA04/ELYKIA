package com.optimize.elykia.sale.application;

import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.finance.application.AccountingDayService;
import com.optimize.elykia.finance.application.DailyAccountancyService;
import com.optimize.elykia.finance.domain.DailyAccountancy;
import com.optimize.elykia.sale.api.BatchRecoveryResult;
import com.optimize.elykia.sale.api.FieldControlCreditPosting;
import com.optimize.elykia.sale.api.FieldControlRecoveryCommand;
import com.optimize.elykia.sale.api.RecordRecoveryBatchCommand;
import com.optimize.elykia.sale.api.RecordRecoveryCommand;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.CreditTimeline;
import com.optimize.elykia.sale.domain.RecoverySource;
import com.optimize.elykia.sale.event.CreditCollectionEvent;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditTimelineRepository;
import com.optimize.elykia.shared.domain.OperationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires du moteur hexagonal {@link CreditRecoveryApplicationService}.
 */
@ExtendWith(MockitoExtension.class)
class CreditRecoveryApplicationServiceTest {

    @Mock private CreditTimelineRepository timelineRepository;
    @Mock private CreditService creditService;
    @Mock private CreditRepository creditRepository;
    @Mock private ClientService clientService;
    @Mock private DailyAccountancyService dailyAccountancyService;
    @Mock private AccountingDayService accountingDayService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private ClientReliquatService clientReliquatService;
    @Mock private UserService userService;
    @Mock private PlatformTransactionManager transactionManager;
    @Mock private TransactionStatus transactionStatus;

    private CreditRecoveryApplicationService service;

    @BeforeEach
    void setUp() {
        lenient().when(transactionManager.getTransaction(any(TransactionDefinition.class))).thenReturn(transactionStatus);
        lenient().when(accountingDayService.ensureAccountingReadyForOperations()).thenReturn(LocalDate.of(2026, 11, 27));
        lenient().when(creditService.getRepository()).thenReturn(creditRepository);
        lenient().when(creditService.update(any(Credit.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(timelineRepository.save(any(CreditTimeline.class))).thenAnswer(inv -> {
            CreditTimeline saved = inv.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(100L);
            }
            return saved;
        });
        lenient().when(dailyAccountancyService.getByCollectorOrCreateNew(any())).thenReturn(new DailyAccountancy());

        service = new CreditRecoveryApplicationService(
                timelineRepository,
                creditService,
                clientService,
                dailyAccountancyService,
                accountingDayService,
                eventPublisher,
                clientReliquatService,
                userService,
                transactionManager
        );
    }

    @Test
    void recordRecovery_idempotentByReference_returnsExistingWithoutReprocessing() {
        CreditTimeline existing = new CreditTimeline();
        existing.setId(42L);
        existing.setReference("REC-EXISTING-1");
        when(timelineRepository.existsByReference("REC-EXISTING-1")).thenReturn(true);
        when(timelineRepository.findByReference("REC-EXISTING-1")).thenReturn(Optional.of(existing));

        RecordRecoveryCommand command = new RecordRecoveryCommand(
                1L, 100.0, "REC-EXISTING-1", "COM001", 0.0, 0.0, null, null, null, RecoverySource.WEB_SINGLE);

        CreditTimeline result = service.recordRecovery(command);

        assertEquals(42L, result.getId());
        verify(accountingDayService, never()).ensureAccountingReadyForOperations();
        verify(creditService, never()).getById(any());
    }

    @Test
    void recordRecovery_autoReliquatClosure_appliesForWebSingleButNotMobileSync() {
        Credit credit = creditInProgress(1L, "COM001", 200.0, 300.0);
        when(timelineRepository.existsByReference("REC-AUTO")).thenReturn(false);
        when(creditService.getById(1L)).thenReturn(credit);
        when(clientReliquatService.getReliquatForClient(10L)).thenReturn(150.0);

        RecordRecoveryCommand webCommand = new RecordRecoveryCommand(
                1L, 200.0, "REC-AUTO", "COM001", 0.0, 0.0, null, null, null, RecoverySource.WEB_SINGLE);

        CreditTimeline result = service.recordRecovery(webCommand);

        assertEquals(300.0, result.getAmount());
        assertEquals(100.0, result.getReliquatUsedAmount());
        assertEquals(CreditStatus.SETTLED, credit.getStatus());
        verify(clientReliquatService).consumeReliquat(10L, 100.0, "REC-AUTO", null);
    }

    @Test
    void recordRecoveryBatch_isolatesItemsInRequiresNew_oneSuccessOneFailure() {
        Credit okCredit = creditInProgress(10L, "COM001", 100.0, 500.0);
        Credit failCredit = creditInProgress(11L, "COM001", 100.0, 150.0);
        when(timelineRepository.existsByReference("MOB-OK")).thenReturn(false);
        when(timelineRepository.existsByReference("MOB-FAIL")).thenReturn(false);
        when(creditRepository.findByIdAndStatus(10L, CreditStatus.INPROGRESS)).thenReturn(Optional.of(okCredit));
        when(creditRepository.findByIdAndStatus(11L, CreditStatus.INPROGRESS)).thenReturn(Optional.of(failCredit));

        RecordRecoveryCommand okItem = new RecordRecoveryCommand(
                10L, 100.0, "MOB-OK", "COM001", 0.0, 0.0, null, null, null, RecoverySource.MOBILE_SYNC);
        RecordRecoveryCommand failItem = new RecordRecoveryCommand(
                11L, 300.0, "MOB-FAIL", "COM001", 0.0, 0.0, null, null, null, RecoverySource.MOBILE_SYNC);

        BatchRecoveryResult result = service.recordRecoveryBatch(
                new RecordRecoveryBatchCommand("COM001", "SYNC-CODE", List.of(okItem, failItem), false));

        assertEquals(List.of("MOB-OK"), result.successRecoveryIds());
        assertEquals(1, result.failedRecoveries().size());
        assertEquals("MOB-FAIL", result.failedRecoveries().get(0).recoveryId());
        verify(transactionManager, times(2)).getTransaction(any(TransactionDefinition.class));
        verify(transactionManager, times(1)).commit(transactionStatus);
        verify(transactionManager, times(1)).rollback(transactionStatus);
    }

    @Test
    void recordRecoveryBatch_legacyDefaultStakeWithoutAmount_capsAtRemainingWhenLowerThanDailyStake() {
        Credit credit = creditInProgress(20L, "COM001", 500.0, 200.0);
        when(timelineRepository.existsByReference("LEG-1")).thenReturn(false);
        when(creditRepository.findByIdAndStatus(20L, CreditStatus.INPROGRESS)).thenReturn(Optional.of(credit));

        RecordRecoveryCommand legacyItem = new RecordRecoveryCommand(
                20L, null, "LEG-1", "COM001", 0.0, 0.0, null, null, null, RecoverySource.MOBILE_SYNC);

        BatchRecoveryResult result = service.recordRecoveryBatch(
                new RecordRecoveryBatchCommand("COM001", null, List.of(legacyItem), true));

        assertEquals(List.of("LEG-1"), result.successRecoveryIds());
        assertTrue(result.failedRecoveries().isEmpty());
        assertEquals(0.0, credit.getTotalAmountRemaining());
        assertEquals(CreditStatus.SETTLED, credit.getStatus());
    }

    @Test
    void recordFieldControlRecovery_splitsCreditAndReliquatAndDefersCashEventPublication() {
        Credit credit = creditInProgress(30L, "COM002", 100.0, 300.0);
        when(timelineRepository.existsByReference("FC-CREDIT-99")).thenReturn(false);
        when(creditService.getById(30L)).thenReturn(credit);

        FieldControlCreditPosting posting = service.recordFieldControlRecovery(
                new FieldControlRecoveryCommand(30L, 450.0, "FC-CREDIT-99"));

        assertFalse(posting.alreadyExisted());
        assertEquals(300.0, posting.imputedOnCredit());
        assertEquals(150.0, posting.reliquat());
        assertEquals(450.0, posting.cash());
        assertEquals(CreditStatus.SETTLED, credit.getStatus());
        verify(clientReliquatService).addReliquat(10L, 150.0, "FC-CREDIT-99", null);
        // L'événement caisse ne doit PAS être publié tant que publishFieldControlCash n'est pas appelé
        verify(eventPublisher, never()).publishEvent(any(CreditCollectionEvent.class));

        service.publishFieldControlCash(posting);
        verify(eventPublisher, times(1)).publishEvent(any(CreditCollectionEvent.class));
    }

    private static Credit creditInProgress(Long id, String commercial, double dailyStake, double remaining) {
        Credit credit = new Credit();
        credit.setId(id);
        credit.setReference("CR-" + id);
        credit.setType(OperationType.CREDIT);
        credit.setStatus(CreditStatus.INPROGRESS);
        credit.setCommercialUsername(commercial);
        credit.setTotalAmount(remaining);
        credit.setTotalAmountPaid(0.0);
        credit.setTotalAmountRemaining(remaining);
        credit.setDailyStake(dailyStake);
        credit.setRemainingDaysCount((int) Math.ceil(remaining / dailyStake));
        credit.setBeginDate(LocalDate.now().minusDays(2));
        credit.setExpectedEndDate(LocalDate.now().plusDays(28));
        Client client = new Client();
        client.setId(10L);
        client.setFirstname("Koffi");
        client.setLastname("Test");
        credit.setClient(client);
        return credit;
    }
}
