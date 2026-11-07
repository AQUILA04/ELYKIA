package com.optimize.elykia.core.listener;

import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.event.CreditCollectionCancelledEvent;
import com.optimize.elykia.core.event.CreditCollectionEvent;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import com.optimize.elykia.core.service.report.DailyCommercialReportPersistence;
import com.optimize.elykia.core.service.report.DailyOperationService;
import com.optimize.elykia.core.service.tontine.TontineCatchupNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@SpringJUnitConfig(CreditCollectionJournalAfterCommitTest.Config.class)
class CreditCollectionJournalAfterCommitTest {

    private static final LocalDate DAY = LocalDate.of(2026, 11, 7);

    @Autowired
    private ApplicationEventPublisher publisher;
    @Autowired
    private PlatformTransactionManager transactionManager;
    @Autowired
    private DailyCommercialReportRepository repository;
    @Autowired
    private DailyCommercialReportPersistence reportPersistence;
    @Autowired
    private DailyOperationService dailyOperationService;

    @BeforeEach
    void resetMocks() {
        reset(repository, reportPersistence, dailyOperationService);
    }

    @Test
    void committedCollection_updatesDepositAndJournal() {
        DailyCommercialReport report = report();
        when(repository.findByDateAndCommercialUsername(any(), eq("COM019"))).thenReturn(Optional.of(report));
        when(reportPersistence.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        new TransactionTemplate(transactionManager).executeWithoutResult(status ->
                publisher.publishEvent(collection(2600d, 0d, 500d)));

        assertEquals(1, report.getCollectionsCount());
        assertEquals(2600d, report.getCollectionsAmount());
        assertEquals(0d, report.getTotalReliquatGeneratedAmount());
        assertEquals(500d, report.getTotalReliquatUsedAmount());
        assertEquals(2100d, report.getTotalAmountToDeposit());
        verify(dailyOperationService).logOperation(
                eq("COM019"),
                eq(OperationType.CREDIT_COLLECTION),
                eq(2600d),
                eq("Recouvrement"),
                any(),
                eq(0d),
                eq(500d));
    }

    @Test
    void rolledBackCollection_leavesReportAndJournalUntouched() {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            publisher.publishEvent(collection(2600d, 0d, 500d));
            status.setRollbackOnly();
        });

        verifyNoInteractions(repository, reportPersistence, dailyOperationService);
    }

    @Test
    void rolledBackCancellation_leavesReportAndJournalUntouched() {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            publisher.publishEvent(new CreditCollectionCancelledEvent(
                    this, 2600d, "COM019", "DIST-019-D3EE7D", "REC-2026019-BF5594", 0d, 500d, DAY));
            status.setRollbackOnly();
        });

        verifyNoInteractions(repository, reportPersistence, dailyOperationService);
    }

    private CreditCollectionEvent collection(double amount, double generated, double used) {
        return new CreditCollectionEvent(
                this, amount, "COM019", "DIST-019-D3EE7D", "REC-2026019-BF5594", generated, used);
    }

    private static DailyCommercialReport report() {
        DailyCommercialReport report = new DailyCommercialReport();
        report.setCommercialUsername("COM019");
        report.setDate(DAY);
        return report;
    }

    @Configuration
    @EnableTransactionManagement
    static class Config {

        @Bean
        PlatformTransactionManager transactionManager() {
            return new NoopTransactionManager();
        }

        @Bean
        DailyCommercialReportRepository dailyCommercialReportRepository() {
            return mock(DailyCommercialReportRepository.class);
        }

        @Bean
        DailyCommercialReportPersistence dailyCommercialReportPersistence() {
            return mock(DailyCommercialReportPersistence.class);
        }

        @Bean
        DailyOperationService dailyOperationService() {
            return mock(DailyOperationService.class);
        }

        @Bean
        TontineCatchupNotificationService tontineCatchupNotificationService() {
            return mock(TontineCatchupNotificationService.class);
        }

        @Bean
        AppNotificationService appNotificationService() {
            return mock(AppNotificationService.class);
        }

        @Bean
        DailyReportEventListener dailyReportEventListener(
                DailyCommercialReportRepository repository,
                DailyCommercialReportPersistence reportPersistence,
                DailyOperationService dailyOperationService,
                TontineCatchupNotificationService tontineCatchupNotificationService,
                AppNotificationService appNotificationService) {
            return new DailyReportEventListener(
                    repository,
                    reportPersistence,
                    dailyOperationService,
                    tontineCatchupNotificationService,
                    appNotificationService);
        }
    }

    static final class NoopTransactionManager extends AbstractPlatformTransactionManager {

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
        }
    }
}
