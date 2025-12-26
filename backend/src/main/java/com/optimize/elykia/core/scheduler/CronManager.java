package com.optimize.elykia.core.scheduler;

import com.optimize.elykia.core.service.CreditService;
import com.optimize.elykia.core.service.PdfService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CronManager {
    
    private final CreditService creditService;
    private final PdfService pdfService;

    @Scheduled(cron = "0 10 11,23 * * *")
    public void updatePromoterCreditStatus() {
        creditService.updatePromoterCreditStatusBatch();
    }

    @Scheduled(cron = "0 10 7,20 * * *")
    public void updatePromoterCreditAmountPAidAndRemaining() {
        creditService.updatePromoterCreditAmountBatch();
    }

    @Scheduled(cron = "0 10 7,20 * * *")
    public void generateReleaseSheet() {
        pdfService.generateReleasePrintedByDate();
    }

}