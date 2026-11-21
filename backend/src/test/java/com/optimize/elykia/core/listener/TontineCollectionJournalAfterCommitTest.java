package com.optimize.elykia.core.listener;

import com.optimize.elykia.notification.api.AppNotificationFacade;
import com.optimize.elykia.finance.domain.DailyCommercialReport;
import com.optimize.elykia.shared.domain.OperationType;
import com.optimize.elykia.core.event.TontineCollectionEvent;
import com.optimize.elykia.finance.infrastructure.persistence.DailyCommercialReportRepository;
import com.optimize.elykia.finance.application.DailyCommercialReportPersistence;
import com.optimize.elykia.finance.application.DailyOperationService;
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

@SpringJUnitConfig(TontineCollectionJournalAfterCommitTest.Config.class)
class TontineCollectionJournalAfterCommitTest {

    private static final LocalDate DAY = LocalDate.of(2026, 11, 16);

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
    void committedCollection_updatesReportAfterCommit() {
        DailyCommercialReport report = report();
        when(repository.findByDateAndCommercialUsername(eq(DAY), eq("COM019"))).thenReturn(Optional.of(report));
        when(reportPersistence.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        new TransactionTemplate(transactionManager).executeWithoutResult(status ->
                publisher.publishEvent(collection()));

        assertEquals(1, report.getTontineCollectionsCount());
        assertEquals(1500d, report.getTontineCollectionsAmount());
        assertEquals(1500d, report.getTotalAmountToDeposit());
        verify(dailyOperationService).logOperation(
                eq("COM019"),
                eq(OperationType.TONTINE_COLLECTION),
                eq(1500d),
                eq("Collecte Tontine"),
                eq("Collecte tontine (Client: Awa)"),
                eq(0d),
                eq(0d),
                eq(DAY));
    }

    @Test
    void rolledBackCollection_leavesReportUntouched() {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            publisher.publishEvent(collection());
            status.setRollbackOnly();
        });

        verifyNoInteractions(repository, reportPersistence, dailyOperationService);
    }

    private TontineCollectionEvent collection() {
        return new TontineCollectionEvent(this, 1500d, "COM019", "Awa", DAY, DAY, 42L, "COL-42");
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
        AppNotificationFacade appNotificationService() {
            return mock(AppNotificationFacade.class);
        }

        @Bean
        DailyReportEventListener dailyReportEventListener(
                DailyCommercialReportRepository repository,
                DailyCommercialReportPersistence reportPersistence,
                DailyOperationService dailyOperationService,
                TontineCatchupNotificationService tontineCatchupNotificationService,
                AppNotificationFacade appNotificationService) {
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
