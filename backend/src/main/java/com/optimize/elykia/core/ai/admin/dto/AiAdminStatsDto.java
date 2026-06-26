package com.optimize.elykia.core.ai.admin.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
@Builder
public class AiAdminStatsDto {
    private int periodDays;
    private List<FrequentQuestionDto> frequentQuestions;
    private List<RejectedSqlDto> rejectedSql;
    private Map<String, Long> intentDistribution;
    private long averageDataLatencyMs;
}
