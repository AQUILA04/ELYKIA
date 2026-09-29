package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Getter
@Builder
public class CustomerActivityLogSummaryDto {
    private Instant from;
    private Instant to;
    private long totalEvents;
    private long errorCount;
    private long authFailureCount;
    private long loginSuccessCount;
    private long uniqueClients;
    private long uniqueDevices;
    private long uniqueSessions;
    private Map<String, Long> byCategory;
    private Map<String, Long> bySource;
    private Map<String, Long> byPlatform;
    private List<NamedCount> topEventTypes;
    private List<NamedCount> topHttpPaths;
    private List<AppVersionStats> byAppVersion;

    @Getter
    @Builder
    public static class NamedCount {
        private String name;
        private long count;
    }

    @Getter
    @Builder
    public static class AppVersionStats {
        private String appVersion;
        private long count;
        private long errorCount;
    }
}
