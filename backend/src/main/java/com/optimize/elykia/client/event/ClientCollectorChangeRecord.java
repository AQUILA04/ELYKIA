package com.optimize.elykia.client.event;

import com.optimize.elykia.client.enumeration.ClientCollectorType;

public record ClientCollectorChangeRecord(
        Long clientId,
        ClientCollectorType collectorType,
        String oldCollector,
        String newCollector) {
}
