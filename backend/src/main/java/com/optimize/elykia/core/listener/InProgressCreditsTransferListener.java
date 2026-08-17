package com.optimize.elykia.core.listener;

import com.optimize.elykia.core.event.InProgressCreditsTransferEvent;
import com.optimize.elykia.core.service.sale.InProgressCreditsTransferService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class InProgressCreditsTransferListener {

    private final InProgressCreditsTransferService inProgressCreditsTransferService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onInProgressCreditsTransfer(InProgressCreditsTransferEvent event) {
        if (event.getClientIds() == null || event.getClientIds().isEmpty()) {
            return;
        }
        inProgressCreditsTransferService.transferAsync(event);
    }
}
