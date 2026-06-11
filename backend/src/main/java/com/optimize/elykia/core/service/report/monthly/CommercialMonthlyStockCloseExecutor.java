package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommercialMonthlyStockCloseExecutor {

    private final CommercialMonthlyStockService monthlyStockService;
    private final MonthlyReportAggregationService aggregationService;

    @Lazy
    @Autowired
    private CommercialMonthlyStockCloseExecutor self;

    public void closeAllCurrentMonthStocksSafely() {
        try {
            LocalDate now = LocalDate.now();
            aggregationService.listActiveCommercials(now.getYear(), now.getMonthValue())
                    .forEach(username -> self.closeSafely(username));
        } catch (Exception exception) {
            log.warn("Impossible de clôturer certains stocks mensuels: {}", exception.getMessage());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void closeSafely(String collector) {
        try {
            monthlyStockService.closeCurrentMonthStock(collector);
        } catch (Exception ignored) {
            // Stock déjà clôturé ou inexistant pour ce commercial
        }
    }
}
