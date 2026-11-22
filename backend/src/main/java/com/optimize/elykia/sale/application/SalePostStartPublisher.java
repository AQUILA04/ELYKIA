package com.optimize.elykia.sale.application;

import com.optimize.elykia.sale.api.SaleBiAggregationPort;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.event.CreditStartedEvent;
import com.optimize.elykia.shared.monitoring.BusinessMetricsPublisher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Publie les effets post-démarrage d'une vente (événement {@link CreditStartedEvent} selon
 * {@link com.optimize.elykia.sale.domain.policy.SaleLifecyclePolicy} et agrégation BI temps réel).
 */
@Component
@Slf4j
public class SalePostStartPublisher {

    private final ApplicationEventPublisher eventPublisher;
    private final Optional<SaleBiAggregationPort> biAggregationService;
    private final Optional<BusinessMetricsPublisher> metricsPublisher;

    public SalePostStartPublisher(
            ApplicationEventPublisher eventPublisher,
            Optional<SaleBiAggregationPort> biAggregationService,
            Optional<BusinessMetricsPublisher> metricsPublisher) {
        this.eventPublisher = eventPublisher;
        this.biAggregationService = biAggregationService;
        this.metricsPublisher = metricsPublisher;
    }

    public void publishAfterStart(Credit credit) {
        Double totalAmount = credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0;
        Double totalPurchase = credit.getTotalPurchase();
        if (totalPurchase == null || totalPurchase <= 0.0) {
            totalPurchase = credit.calculTotalPurchase();
        }
        Double margin = totalAmount - (totalPurchase != null ? totalPurchase : 0.0);

        if (eventPublisher != null && credit.lifecyclePolicy().publishesCreditStartedEvent()) {
            eventPublisher.publishEvent(new CreditStartedEvent(
                    this,
                    credit.getTotalAmount(),
                    credit.getCollector(),
                    credit.getAdvance(),
                    margin,
                    credit.getClient().getFullName(),
                    credit.getReference()));
        }

        biAggregationService.ifPresent(port -> {
            try {
                port.updateSalesAggregation(credit);
            } catch (Exception e) {
                log.error("Error updating sales aggregation: {}", e.getMessage(), e);
                metricsPublisher.ifPresent(m -> m.creditBiAggregationError(credit.getReference()));
            }
        });
    }
}
