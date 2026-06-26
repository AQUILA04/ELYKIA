package com.optimize.elykia.core.ai.admin;

import com.optimize.elykia.core.ai.admin.dto.AiAdminStatsDto;
import com.optimize.elykia.core.ai.admin.dto.FrequentQuestionDto;
import com.optimize.elykia.core.ai.admin.dto.IntentCountDto;
import com.optimize.elykia.core.ai.admin.dto.RejectedSqlDto;
import com.optimize.elykia.core.ai.audit.entity.AiQueryLog;
import com.optimize.elykia.core.ai.audit.repository.AiQueryLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiAdminStatsService {

    private final AiQueryLogRepository queryLogRepository;

    public AiAdminStatsDto getStats(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<FrequentQuestionDto> frequentQuestions = queryLogRepository.findFrequentQuestions(since, 15)
                .stream()
                .map(row -> FrequentQuestionDto.builder()
                        .question((String) row[0])
                        .count(((Number) row[1]).longValue())
                        .build())
                .toList();

        List<RejectedSqlDto> rejectedSql = queryLogRepository
                .findTop50ByStatusInAndCreatedAtAfterOrderByCreatedAtDesc(
                        List.of("REJECTED_SQL", "FAILED"), since)
                .stream()
                .map(this::toRejectedSql)
                .toList();

        Map<String, Long> intentDistribution = new LinkedHashMap<>();
        for (Object[] row : queryLogRepository.countByIntentSince(since)) {
            String intent = row[0] != null ? row[0].toString() : "UNKNOWN";
            intentDistribution.put(intent, ((Number) row[1]).longValue());
        }

        Double avgLatency = queryLogRepository.averageDataLatencySince(since);

        return AiAdminStatsDto.builder()
                .periodDays(days)
                .frequentQuestions(frequentQuestions)
                .rejectedSql(rejectedSql)
                .intentDistribution(intentDistribution)
                .averageDataLatencyMs(avgLatency != null ? avgLatency.longValue() : 0L)
                .build();
    }

    private RejectedSqlDto toRejectedSql(AiQueryLog log) {
        return RejectedSqlDto.builder()
                .question(log.getQuestion())
                .sql(log.getSqlText())
                .error(log.getErrorMessage())
                .username(log.getUsername())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
