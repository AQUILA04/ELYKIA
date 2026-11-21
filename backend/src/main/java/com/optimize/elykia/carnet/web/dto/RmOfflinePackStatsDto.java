package com.optimize.elykia.carnet.web.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RmOfflinePackStatsDto {
    private long lateCredits;
    private long clients;
    private long tontineMembers;
    private long estimatedBytes;
}
