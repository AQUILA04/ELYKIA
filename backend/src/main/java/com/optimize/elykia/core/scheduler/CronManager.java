package com.optimize.elykia.core.scheduler;

import com.optimize.elykia.core.repository.CreditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CronManager {
    
      private final CreditRepository creditRepository;

    @Scheduled(cron = "0 0 8 * * *")
    public void updatePromoterCreditStatus() {
        creditRepository.updateDailyPaidForCredit();
    }

}