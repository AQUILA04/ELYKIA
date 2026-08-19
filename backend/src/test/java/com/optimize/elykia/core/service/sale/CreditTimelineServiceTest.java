package com.optimize.elykia.core.service.sale;

import com.optimize.common.securities.models.User;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.entity.accounting.DailyAccountancy;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.mapper.CreditMapper;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.service.accounting.AccountingDayService;
import com.optimize.elykia.core.service.accounting.DailyAccountancyService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreditTimelineServiceTest {

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
    private Credit credit;
    @Mock
    private CreditTimeline timeline;
    @Mock
    private DailyAccountancy dailyAccountancy;
    @Mock
    private Client client;
    @InjectMocks
    private CreditTimelineService service;

    @Test
    void dailyStakeFactor_attachesAccountingCreatesReferenceUpdatesCreditAndPersistsTimeline() {
        // Given
        when(dailyAccountancyService.getByCollectorOrCreateNew("collector.a")).thenReturn(dailyAccountancy);
        when(credit.getCollector()).thenReturn("collector.a");
        when(credit.getDailyStake()).thenReturn(100.0);
        when(credit.dailyStakeOperation(timeline)).thenReturn(timeline);
        when(timeline.getCollector()).thenReturn(null);
        when(timeline.getReference()).thenReturn(null);
        when(timeline.getAmount()).thenReturn(100.0);
        when(timeline.getReliquatGeneratedAmount()).thenReturn(0.0);
        when(timeline.getReliquatUsedAmount()).thenReturn(0.0);
        when(credit.getStatus()).thenReturn(CreditStatus.INPROGRESS);
        when(credit.getTotalAmountRemaining()).thenReturn(400.0);
        when(credit.getReference()).thenReturn("CR-001");
        when(credit.getClient()).thenReturn(client);
        when(client.getFullName()).thenReturn("Client Test");

        // When
        service.dailyStakeFactor(credit, timeline);

        // Then
        verify(credit).checkInProgressStatus();
        verify(timeline).checkStakeValue(100.0);
        verify(timeline).setDailyAccountancy(dailyAccountancy);
        verify(timeline).setCollector("collector.a");
        ArgumentCaptor<String> referenceCaptor = ArgumentCaptor.forClass(String.class);
        verify(timeline).setReference(referenceCaptor.capture());
        assertTrue(referenceCaptor.getValue().startsWith("REC-"));
        verify(creditService).update(credit);
        verify(repository).save(timeline);
        verify(eventPublisher).publishEvent(any());
    }
}
