package com.optimize.elykia.core.service.client;

import com.optimize.elykia.client.entity.ClientCollectorHistory;
import com.optimize.elykia.client.enumeration.ClientCollectorType;
import com.optimize.elykia.client.event.ClientCollectorChangeRecord;
import com.optimize.elykia.client.event.ClientCollectorsChangedEvent;
import com.optimize.elykia.client.repository.ClientCollectorHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ClientCollectorHistoryServiceTest {

    @Mock
    private ClientCollectorHistoryRepository historyRepository;

    @Test
    void persistHistoryAsync_ignoresEventWithoutChanges() {
        // Given
        ClientCollectorHistoryService service = new ClientCollectorHistoryService(historyRepository);
        ClientCollectorsChangedEvent event = new ClientCollectorsChangedEvent(this, List.of(), "gestionnaire.a");

        // When
        service.persistHistoryAsync(event);

        // Then
        verify(historyRepository, never()).saveAll(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void persistHistoryAsync_persistsEveryCollectorChangeWithSharedAuditAuthorAndTimestamp() {
        // Given
        ClientCollectorHistoryService service = new ClientCollectorHistoryService(historyRepository);
        ClientCollectorsChangedEvent event = new ClientCollectorsChangedEvent(
                this,
                List.of(
                        new ClientCollectorChangeRecord(10L, ClientCollectorType.CREDIT, "commercial.old", "commercial.new"),
                        new ClientCollectorChangeRecord(11L, ClientCollectorType.TONTINE, null, "commercial.new")),
                "gestionnaire.a");
        ArgumentCaptor<Iterable<ClientCollectorHistory>> historiesCaptor = ArgumentCaptor.forClass(Iterable.class);
        LocalDateTime before = LocalDateTime.now();

        // When
        service.persistHistoryAsync(event);

        // Then
        LocalDateTime after = LocalDateTime.now();
        verify(historyRepository).saveAll(historiesCaptor.capture());
        List<ClientCollectorHistory> histories = new java.util.ArrayList<>();
        historiesCaptor.getValue().forEach(histories::add);
        assertEquals(2, histories.size());
        assertEquals(10L, histories.get(0).getClientId());
        assertEquals(ClientCollectorType.CREDIT, histories.get(0).getCollectorType());
        assertEquals("commercial.old", histories.get(0).getOldCollector());
        assertEquals("commercial.new", histories.get(0).getNewCollector());
        assertEquals("gestionnaire.a", histories.get(0).getPerformedBy());
        assertNotNull(histories.get(0).getChangeDate());
        assertEquals(histories.get(0).getChangeDate(), histories.get(1).getChangeDate());
        assertEquals(false, histories.get(0).getChangeDate().isBefore(before));
        assertEquals(false, histories.get(0).getChangeDate().isAfter(after));
        assertEquals(11L, histories.get(1).getClientId());
        assertEquals(ClientCollectorType.TONTINE, histories.get(1).getCollectorType());
        assertEquals(null, histories.get(1).getOldCollector());
        assertEquals("commercial.new", histories.get(1).getNewCollector());
    }
}
