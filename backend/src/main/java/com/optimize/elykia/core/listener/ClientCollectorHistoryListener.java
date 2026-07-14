package com.optimize.elykia.core.listener;

import com.optimize.elykia.client.event.ClientCollectorsChangedEvent;
import com.optimize.elykia.core.service.client.ClientCollectorHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listens for collector changes and persists history asynchronously
 * only after the bulk-update transaction has successfully committed.
 * <p>
 * {@code @Async} is intentionally NOT combined on this method: stacking
 * {@code @Async} with {@code @TransactionalEventListener} is fragile
 * (aspect ordering). The commit gate stays synchronous; async work is
 * delegated to {@link ClientCollectorHistoryService}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ClientCollectorHistoryListener {

    private final ClientCollectorHistoryService clientCollectorHistoryService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onClientCollectorsChanged(ClientCollectorsChangedEvent event) {
        if (event.getChanges() == null || event.getChanges().isEmpty()) {
            return;
        }
        clientCollectorHistoryService.persistHistoryAsync(event);
    }
}
