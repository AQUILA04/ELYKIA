package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.event.InProgressCreditsTransferEvent;
import com.optimize.elykia.core.repository.CreditCollectorHistoryRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class InProgressCreditsTransferService {

    private static final int BATCH_SIZE = 500;

    private final CreditCollectorHistoryRepository creditCollectorHistoryRepository;
    private final CreditRepository creditRepository;
    private final ClientService clientService;

    @Async("creditCollectorTransferExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void transferAsync(InProgressCreditsTransferEvent event) {
        if (event.getClientIds() == null || event.getClientIds().isEmpty()
                || !StringUtils.hasText(event.getNewCollector())
                || !StringUtils.hasText(event.getPerformedBy())) {
            return;
        }

        String newCollector = event.getNewCollector();
        String performedBy = event.getPerformedBy();
        int totalUpdated = 0;

        for (List<Long> batch : partition(event.getClientIds(), BATCH_SIZE)) {
            creditCollectorHistoryRepository.bulkInsertHistoryForInProgressCreditsByClientIds(
                    batch, newCollector, performedBy, performedBy);
            int updated = creditRepository.bulkUpdateCollectorForInProgressByClientIds(batch, newCollector);
            clientService.bulkUpdateRecoveryCollectors(batch, newCollector);
            totalUpdated += updated;
        }

        log.info("Transfert async de {} vente(s) INPROGRESS vers {} pour {} client(s) par {}",
                totalUpdated, newCollector, event.getClientIds().size(), performedBy);
    }

    private static List<List<Long>> partition(List<Long> ids, int batchSize) {
        List<List<Long>> batches = new ArrayList<>();
        for (int i = 0; i < ids.size(); i += batchSize) {
            batches.add(ids.subList(i, Math.min(i + batchSize, ids.size())));
        }
        return batches;
    }
}
