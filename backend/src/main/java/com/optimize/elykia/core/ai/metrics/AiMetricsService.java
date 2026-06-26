package com.optimize.elykia.core.ai.metrics;

import com.optimize.elykia.core.ai.enums.AiIntent;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "elykia.ai.enabled", havingValue = "true")
public class AiMetricsService {

    private final MeterRegistry meterRegistry;

    public void recordIntent(AiIntent intent) {
        Counter.builder("ai.intent.distribution")
                .tag("intent", intent.name())
                .register(meterRegistry)
                .increment();
    }

    public Timer.Sample startSqlTimer() {
        return Timer.start(meterRegistry);
    }

    public void recordSqlLatency(Timer.Sample sample, boolean success) {
        sample.stop(Timer.builder("ai.sql.latency")
                .tag("success", String.valueOf(success))
                .register(meterRegistry));
    }

    public void recordHelpSourcesHit(int sourcesCount) {
        if (sourcesCount <= 0) {
            return;
        }
        Counter.builder("ai.help.sources_hit")
                .register(meterRegistry)
                .increment(sourcesCount);
    }

    public void recordQueryStatus(String status) {
        Counter.builder("ai.query.status")
                .tag("status", status)
                .register(meterRegistry)
                .increment();
    }
}
