package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RmOfflinePackStatsDto {
    private long lateCredits;
    private long clients;
    private long estimatedBytes;
}
