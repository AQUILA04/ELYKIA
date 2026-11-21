package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.finance.api.CreditAccountingPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Adaptateur SPI liant le module {@code finance} aux requêtes comptables sur les crédits.
 */
@Component
@RequiredArgsConstructor
public class CreditAccountingPortAdapter implements CreditAccountingPort {

    private final CreditRepository creditRepository;
    private final CreditTimelineRepository creditTimelineRepository;

    @Override
    public int resetDailyPaidForActiveCredits() {
        return creditRepository.updateDailyPaidForCredit();
    }

    @Override
    public Double sumCollectedAmountByDate(LocalDateTime start, LocalDateTime end) {
        return creditTimelineRepository.sumAmountByDate(start, end);
    }

    @Override
    public Double sumCollectedAmountByCollectorAndDate(String collector, LocalDateTime start, LocalDateTime end) {
        return creditTimelineRepository.sumAmountByCollectorAndDate(collector, start, end);
    }

    @Override
    public Double sumCollectedAmountByDailyAccountancyId(Long dailyAccountancyId) {
        return creditTimelineRepository.sumAmountByDailyAccountancyId(dailyAccountancyId);
    }
}
