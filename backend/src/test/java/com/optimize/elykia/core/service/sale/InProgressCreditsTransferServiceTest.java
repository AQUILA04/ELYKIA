package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.event.InProgressCreditsTransferEvent;
import com.optimize.elykia.core.repository.CreditCollectorHistoryRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.stream.LongStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class InProgressCreditsTransferServiceTest {

    @Mock
    private CreditCollectorHistoryRepository creditCollectorHistoryRepository;
    @Mock
    private CreditRepository creditRepository;
    @Mock
    private ClientService clientService;
    @InjectMocks
    private InProgressCreditsTransferService service;
    @Captor
    private ArgumentCaptor<List<Long>> batchesCaptor;

    @Test
    void transferAsync_ignoresEventWithoutMandatoryTransferData() {
        // Given
        InProgressCreditsTransferEvent event = new InProgressCreditsTransferEvent(this, List.of(1L), "", "admin");

        // When
        service.transferAsync(event);

        // Then
        verifyNoInteractions(creditCollectorHistoryRepository, creditRepository, clientService);
    }

    @Test
    void transferAsync_recordsHistoryUpdatesCreditsAndSynchronizesClientCollectors() {
        // Given
        List<Long> clientIds = List.of(10L, 20L);
        InProgressCreditsTransferEvent event = new InProgressCreditsTransferEvent(
                this, clientIds, "collector.new", "admin");

        // When
        service.transferAsync(event);

        // Then
        verify(creditCollectorHistoryRepository).bulkInsertHistoryForInProgressCreditsByClientIds(
                clientIds, "collector.new", "admin", "admin");
        verify(creditRepository).bulkUpdateCollectorForInProgressByClientIds(clientIds, "collector.new");
        verify(clientService).bulkUpdateRecoveryCollectors(clientIds, "collector.new");
    }

    @Test
    void transferAsync_processesMoreThanFiveHundredClientsInSeparateBatches() {
        // Given
        List<Long> clientIds = LongStream.rangeClosed(1, 501).boxed().toList();
        InProgressCreditsTransferEvent event = new InProgressCreditsTransferEvent(
                this, clientIds, "collector.new", "admin");
        // When
        service.transferAsync(event);

        // Then
        verify(creditRepository, times(2)).bulkUpdateCollectorForInProgressByClientIds(batchesCaptor.capture(), org.mockito.ArgumentMatchers.eq("collector.new"));
        assertEquals(List.of(1L, 2L, 3L), batchesCaptor.getAllValues().get(0).subList(0, 3));
        assertEquals(500, batchesCaptor.getAllValues().get(0).size());
        assertEquals(List.of(501L), batchesCaptor.getAllValues().get(1));
        verify(creditCollectorHistoryRepository, times(2)).bulkInsertHistoryForInProgressCreditsByClientIds(
                org.mockito.ArgumentMatchers.anyList(), org.mockito.ArgumentMatchers.eq("collector.new"),
                org.mockito.ArgumentMatchers.eq("admin"), org.mockito.ArgumentMatchers.eq("admin"));
        verify(clientService, times(2)).bulkUpdateRecoveryCollectors(
                org.mockito.ArgumentMatchers.anyList(), org.mockito.ArgumentMatchers.eq("collector.new"));
    }
}
