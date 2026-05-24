package com.optimize.elykia.core.monitoring;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

@Component
public class BusinessMetricsPublisher {

    private final MeterRegistry meterRegistry;
    private final AtomicInteger articlesOutOfStock = new AtomicInteger(0);
    private final AtomicInteger articlesLowStock = new AtomicInteger(0);

    public BusinessMetricsPublisher(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        meterRegistry.gauge("elykia.articles.outofstock", articlesOutOfStock);
        meterRegistry.gauge("elykia.articles.lowstock", articlesLowStock);
    }

    // ========= CREDIT METRICS =========

    public void creditCreated(String collector, String type) {
        Counter.builder("elykia.credit.created")
                .tag("collector", collector)
                .tag("type", type)
                .register(meterRegistry)
                .increment();
    }

    public void creditCreationFailed(String reason) {
        Counter.builder("elykia.credit.creation.failed")
                .tag("reason", reason)
                .register(meterRegistry)
                .increment();
    }

    public void creditStartStockOut(String collector) {
        Counter.builder("elykia.credit.start.stockout")
                .tag("collector", collector)
                .register(meterRegistry)
                .increment();
    }

    public void creditDistributionStockOut(String collector) {
        Counter.builder("elykia.credit.distribution.stockout")
                .tag("collector", collector)
                .register(meterRegistry)
                .increment();
    }

    public void creditCollectorChanged(String oldCollector, String newCollector) {
        Counter.builder("elykia.credit.collector.changed")
                .tag("oldCollector", oldCollector)
                .tag("newCollector", newCollector)
                .register(meterRegistry)
                .increment();
    }

    public void creditDailyStakeChanged(Long creditId) {
        Counter.builder("elykia.credit.dailystake.changed")
                .register(meterRegistry)
                .increment();
    }

    public void creditBiAggregationError(String creditRef) {
        Counter.builder("elykia.credit.aggregation.error")
                .tag("creditRef", creditRef)
                .register(meterRegistry)
                .increment();
    }

    public void creditSettled(String collector) {
        Counter.builder("elykia.credit.settled")
                .tag("collector", collector)
                .register(meterRegistry)
                .increment();
    }

    // ========= COLLECTION METRICS =========

    public void collectionRecorded(String collector, Double amount) {
        Counter.builder("elykia.collection.recorded")
                .tag("collector", collector)
                .register(meterRegistry)
                .increment();
    }

    public void collectionFailed(String collector, String reason) {
        Counter.builder("elykia.collection.failed")
                .tag("collector", collector)
                .tag("reason", reason)
                .register(meterRegistry)
                .increment();
    }

    // ========= STOCK REQUEST METRICS =========

    public void stockRequestCreated(String collector) {
        Counter.builder("elykia.stockrequest.created")
                .tag("collector", collector)
                .register(meterRegistry)
                .increment();
    }

    public void stockRequestDelivered(String collector, boolean partial) {
        Counter.builder("elykia.stockrequest.delivered")
                .tag("collector", collector)
                .tag("partial", String.valueOf(partial))
                .register(meterRegistry)
                .increment();
    }

    public void stockRequestDeliveryFailed(String collector) {
        Counter.builder("elykia.stockrequest.delivery.failed")
                .tag("collector", collector)
                .register(meterRegistry)
                .increment();
    }

    public void stockRequestAutoCancelled() {
        Counter.builder("elykia.stockrequest.auto.cancelled")
                .register(meterRegistry)
                .increment();
    }

    public void stockRequestPriceConflict(String collector) {
        Counter.builder("elykia.stockrequest.price.conflict")
                .tag("collector", collector)
                .register(meterRegistry)
                .increment();
    }

    // ========= STOCK RETURN METRICS =========

    public void stockReturnCreated(String collector) {
        Counter.builder("elykia.stockreturn.created")
                .tag("collector", collector)
                .register(meterRegistry)
                .increment();
    }

    public void stockReturnProcessed(String collector) {
        Counter.builder("elykia.stockreturn.processed")
                .tag("collector", collector)
                .register(meterRegistry)
                .increment();
    }

    public void stockReturnExceedsStock(String collector) {
        Counter.builder("elykia.stockreturn.exceeds.stock")
                .tag("collector", collector)
                .register(meterRegistry)
                .increment();
    }

    // ========= RATTRAPAGE METRICS =========

    public void rattrapageCreated(String collector) {
        Counter.builder("elykia.rattrapage.created")
                .tag("collector", collector)
                .register(meterRegistry)
                .increment();
    }

    public void rattrapageStockInsufficient(String collector) {
        Counter.builder("elykia.rattrapage.stock.insufficient")
                .tag("collector", collector)
                .register(meterRegistry)
                .increment();
    }

    // ========= TONTINE METRICS =========

    public void tontineMemberRegistered(String collector) {
        Counter.builder("elykia.tontine.member.registered")
                .tag("collector", collector)
                .register(meterRegistry)
                .increment();
    }

    public void tontineCollectionRecorded(String collector, Double amount) {
        Counter.builder("elykia.tontine.collection.recorded")
                .tag("collector", collector)
                .register(meterRegistry)
                .increment();
    }

    public void tontineDeliveryCreated(String commercial) {
        Counter.builder("elykia.tontine.delivery.created")
                .tag("commercial", commercial)
                .register(meterRegistry)
                .increment();
    }

    public void tontineDeliveryAmountExceeded(String commercial) {
        Counter.builder("elykia.tontine.delivery.amount.exceeded")
                .tag("commercial", commercial)
                .register(meterRegistry)
                .increment();
    }

    // ========= INVENTORY METRICS =========

    public void inventoryCreated() {
        Counter.builder("elykia.inventory.created")
                .register(meterRegistry)
                .increment();
    }

    public void inventoryFinalized() {
        Counter.builder("elykia.inventory.finalized")
                .register(meterRegistry)
                .increment();
    }

    public void inventoryFinalizationBlocked() {
        Counter.builder("elykia.inventory.finalization.blocked")
                .register(meterRegistry)
                .increment();
    }

    // ========= GAUGES (state-based, updated via scheduler) =========

    public void setArticlesOutOfStock(int count) {
        articlesOutOfStock.set(count);
    }

    public void setArticlesLowStock(int count) {
        articlesLowStock.set(count);
    }

    // ========= TIMERS =========

    public Timer.Sample startTimer() {
        return Timer.start(meterRegistry);
    }

    public void stopTimer(Timer.Sample sample, String operation, String collector) {
        sample.stop(Timer.builder("elykia.operation.duration")
                .tag("operation", operation)
                .tag("collector", collector)
                .register(meterRegistry));
    }
}
