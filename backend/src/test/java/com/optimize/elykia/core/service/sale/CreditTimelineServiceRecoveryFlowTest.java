package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.CollectorDailyStakeDto;
import com.optimize.elykia.core.dto.CreditTimelineDto;
import com.optimize.elykia.core.dto.DefaultDailyStakeUnitDto;
import com.optimize.elykia.core.dto.SpecialDailyStakeResponseDto;
import com.optimize.elykia.core.entity.accounting.DailyAccountancy;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.mapper.CreditMapper;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.service.accounting.AccountingDayService;
import com.optimize.elykia.core.service.accounting.DailyAccountancyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Couvre le flow recouvrement critique :
 * ensure journée comptable HORS TX, puis mise en REQUIRES_NEW
 * (évite Could not open JPA EntityManager / UnexpectedRollbackException).
 */
@ExtendWith(MockitoExtension.class)
class CreditTimelineServiceRecoveryFlowTest {

    @Mock
    private CreditTimelineRepository repository;
    @Mock
    private CreditMapper creditMapper;
    @Mock
    private CreditService creditService;
    @Mock
    private ClientService clientService;
    @Mock
    private DailyAccountancyService dailyAccountancyService;
    @Mock
    private AccountingDayService accountingDayService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private ClientReliquatService clientReliquatService;
    @Mock
    private PlatformTransactionManager transactionManager;
    @Mock
    private TransactionStatus transactionStatus;
    @Mock
    private CreditRepository creditRepository;

    private CreditTimelineService service;

    @BeforeEach
    void setUp() {
        lenient().when(transactionManager.getTransaction(any(TransactionDefinition.class))).thenReturn(transactionStatus);
        service = new CreditTimelineService(
                repository,
                creditMapper,
                creditService,
                clientService,
                dailyAccountancyService,
                accountingDayService,
                eventPublisher,
                clientReliquatService,
                transactionManager
        );
    }

    @Test
    void makeDailyStake_ensuresAccountingBeforeOpeningTransaction() {
        AtomicBoolean ensureCalled = new AtomicBoolean(false);
        AtomicBoolean txOpenedAfterEnsure = new AtomicBoolean(false);

        when(repository.existsByReference(anyString())).thenReturn(false);
        when(accountingDayService.ensureAccountingReadyForOperations()).thenAnswer(inv -> {
            ensureCalled.set(true);
            return LocalDate.of(2026, 7, 17);
        });
        when(transactionManager.getTransaction(any(TransactionDefinition.class))).thenAnswer(inv -> {
            txOpenedAfterEnsure.set(ensureCalled.get());
            return transactionStatus;
        });

        Credit credit = inProgressCredit(1L, "collector1", 100.0, 1000.0);
        CreditTimelineDto dto = stakeDto(1L, 100.0, "REC-WEB-1");
        CreditTimeline mapped = new CreditTimeline();
        mapped.setAmount(100.0);
        mapped.setReference("REC-WEB-1");

        when(creditMapper.toCreditTimeline(any())).thenReturn(mapped);
        when(creditService.getById(1L)).thenReturn(credit);
        when(dailyAccountancyService.getByCollectorOrCreateNew("collector1")).thenReturn(new DailyAccountancy());
        when(creditService.update(any(Credit.class))).thenAnswer(inv -> inv.getArgument(0));
        when(repository.save(any(CreditTimeline.class))).thenAnswer(inv -> {
            CreditTimeline saved = inv.getArgument(0);
            saved.setId(50L);
            return saved;
        });

        CreditTimeline result = service.makeDailyStake(dto);

        assertEquals(50L, result.getId());
        assertTrue(txOpenedAfterEnsure.get(), "La TX métier doit s'ouvrir après ensureAccountingReadyForOperations");

        InOrder order = inOrder(accountingDayService, transactionManager);
        order.verify(accountingDayService).ensureAccountingReadyForOperations();
        order.verify(transactionManager, atLeastOnce()).getTransaction(any(TransactionDefinition.class));
        verify(transactionManager).commit(transactionStatus);
        verify(accountingDayService, times(1)).ensureAccountingReadyForOperations();
    }

    @Test
    void dailyStakeFactor_doesNotCallEnsureAccounting() {
        Credit credit = inProgressCredit(2L, "collector2", 50.0, 500.0);
        CreditTimeline timeline = new CreditTimeline();
        timeline.setAmount(50.0);
        timeline.setReference("REC-FACTOR-1");
        timeline.setNormalStake(true);

        when(dailyAccountancyService.getByCollectorOrCreateNew("collector2")).thenReturn(new DailyAccountancy());
        when(creditService.update(any(Credit.class))).thenAnswer(inv -> inv.getArgument(0));
        when(repository.save(any(CreditTimeline.class))).thenAnswer(inv -> inv.getArgument(0));

        service.dailyStakeFactor(credit, timeline);

        verify(accountingDayService, never()).ensureAccountingReadyForOperations();
        verify(dailyAccountancyService).getByCollectorOrCreateNew("collector2");
        verify(repository).save(any(CreditTimeline.class));
    }

    @Test
    void defaultDailyStakeByCollector_ensuresOnceThenIsolatesEachStakeInOwnTransaction() {
        when(accountingDayService.ensureAccountingReadyForOperations()).thenReturn(LocalDate.of(2026, 7, 17));
        when(creditService.getRepository()).thenReturn(creditRepository);

        Credit okCredit = inProgressCredit(10L, "collector1", 100.0, 1000.0);
        // mise > restant → exception métier isolée (ne doit pas casser l'autre TX)
        Credit badCredit = inProgressCredit(99L, "collector1", 200.0, 100.0);
        when(repository.existsByReference("REC-OK")).thenReturn(false);
        when(repository.existsByReference("REC-FAIL")).thenReturn(false);
        when(creditRepository.findByIdAndStatus(10L, CreditStatus.INPROGRESS)).thenReturn(Optional.of(okCredit));
        when(creditRepository.findByIdAndStatus(99L, CreditStatus.INPROGRESS)).thenReturn(Optional.of(badCredit));

        when(dailyAccountancyService.getByCollectorOrCreateNew("collector1")).thenReturn(new DailyAccountancy());
        when(creditService.update(any(Credit.class))).thenAnswer(inv -> inv.getArgument(0));
        when(repository.save(any(CreditTimeline.class))).thenAnswer(inv -> inv.getArgument(0));

        CollectorDailyStakeDto dto = new CollectorDailyStakeDto();
        dto.setCollector("collector1");
        DefaultDailyStakeUnitDto ok = new DefaultDailyStakeUnitDto();
        ok.setCreditId(10L);
        ok.setRecoveryId("REC-OK");
        DefaultDailyStakeUnitDto fail = new DefaultDailyStakeUnitDto();
        fail.setCreditId(99L);
        fail.setRecoveryId("REC-FAIL");
        dto.setStakeUnits(List.of(ok, fail));

        SpecialDailyStakeResponseDto response = service.defaultDailyStakeByCollector(dto);

        assertEquals(List.of("REC-OK"), response.getSuccessRecoveryIds());
        assertEquals(1, response.getFailedRecoveries().size());
        assertEquals("REC-FAIL", response.getFailedRecoveries().get(0).getRecoveryId());

        verify(accountingDayService, times(1)).ensureAccountingReadyForOperations();
        // Une TX par unité (isolation REQUIRES_NEW)
        verify(transactionManager, times(2)).getTransaction(any(TransactionDefinition.class));
        verify(transactionManager, times(1)).commit(transactionStatus);
        verify(transactionManager, times(1)).rollback(transactionStatus);

        InOrder order = inOrder(accountingDayService, transactionManager);
        order.verify(accountingDayService).ensureAccountingReadyForOperations();
        order.verify(transactionManager, times(2)).getTransaction(any(TransactionDefinition.class));
    }

    @Test
    void makeDailyStake_returnsExistingTimelineWithoutEnsureWhenReferenceAlreadySynced() {
        CreditTimeline existing = new CreditTimeline();
        existing.setId(7L);
        existing.setReference("REC-DUP");
        when(repository.existsByReference("REC-DUP")).thenReturn(true);
        when(repository.findByReference("REC-DUP")).thenReturn(Optional.of(existing));

        CreditTimelineDto dto = stakeDto(1L, 100.0, "REC-DUP");

        CreditTimeline result = service.makeDailyStake(dto);

        assertEquals(7L, result.getId());
        verify(accountingDayService, never()).ensureAccountingReadyForOperations();
        verify(transactionManager, never()).getTransaction(any(TransactionDefinition.class));
    }

    private static CreditTimelineDto stakeDto(Long creditId, Double amount, String reference) {
        CreditTimelineDto dto = new CreditTimelineDto();
        dto.setCreditId(creditId);
        dto.setAmount(amount);
        dto.setReference(reference);
        dto.setNormalStake(true);
        return dto;
    }

    private static Credit inProgressCredit(Long id, String collector, double dailyStake, double remaining) {
        Credit credit = new Credit();
        credit.setId(id);
        credit.setCollector(collector);
        credit.setDailyStake(dailyStake);
        credit.setTotalAmount(remaining);
        credit.setTotalAmountPaid(0.0);
        credit.setTotalAmountRemaining(remaining);
        credit.setRemainingDaysCount(10);
        credit.setStatus(CreditStatus.INPROGRESS);
        credit.setType(OperationType.CREDIT);
        credit.setReference("CR-" + id);
        Client client = new Client();
        client.setFirstname("Jean");
        client.setLastname("Test");
        credit.setClient(client);
        return credit;
    }
}
