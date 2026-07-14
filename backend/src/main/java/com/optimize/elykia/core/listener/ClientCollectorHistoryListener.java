package com.optimize.elykia.core.listener;

import com.optimize.elykia.client.entity.ClientCollectorHistory;
import com.optimize.elykia.client.event.ClientCollectorChangeRecord;
import com.optimize.elykia.client.event.ClientCollectorsChangedEvent;
import com.optimize.elykia.client.repository.ClientCollectorHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ClientCollectorHistoryListener {

    private final ClientCollectorHistoryRepository clientCollectorHistoryRepository;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onClientCollectorsChanged(ClientCollectorsChangedEvent event) {
        if (event.getChanges() == null || event.getChanges().isEmpty()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        List<ClientCollectorHistory> entries = new ArrayList<>(event.getChanges().size());
        for (ClientCollectorChangeRecord change : event.getChanges()) {
            ClientCollectorHistory history = new ClientCollectorHistory();
            history.setClientId(change.clientId());
            history.setCollectorType(change.collectorType());
            history.setOldCollector(change.oldCollector());
            history.setNewCollector(change.newCollector());
            history.setPerformedBy(event.getPerformedBy());
            history.setChangeDate(now);
            entries.add(history);
        }
        clientCollectorHistoryRepository.saveAll(entries);
        log.info("Historique commercial client enregistré pour {} changement(s) par {}",
                entries.size(), event.getPerformedBy());
    }
}
