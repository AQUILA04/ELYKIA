package com.optimize.elykia.core.scheduler;

import com.optimize.elykia.core.service.customer.PaymentProofService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentProofPurgeScheduler {

    private final PaymentProofService paymentProofService;

    /** Tous les jours à 04:10 — justificatifs non rattachés (formulaires abandonnés). */
    @Scheduled(cron = "0 10 4 * * *")
    public void purge() {
        int deleted = paymentProofService.purgeUnlinkedOlderThanRetention();
        if (deleted > 0) {
            log.info("Purged {} unlinked payment proofs", deleted);
        }
    }
}
