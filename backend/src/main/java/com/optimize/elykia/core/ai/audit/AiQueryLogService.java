package com.optimize.elykia.core.ai.audit;

import com.optimize.elykia.core.ai.audit.entity.AiQueryLog;
import com.optimize.elykia.core.ai.audit.repository.AiQueryLogRepository;
import com.optimize.elykia.core.ai.enums.AiIntent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AiQueryLogService {

    private final AiQueryLogRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logSuccess(Long userId, String username, UUID conversationId, String question,
                           AiIntent intent, String sql, long durationMs, Integer rowCount, Integer sourcesHit) {
        AiQueryLog log = baseLog(userId, username, conversationId, question, intent);
        log.setStatus("SUCCESS");
        log.setSqlText(sql);
        log.setDurationMs(durationMs);
        log.setRowCount(rowCount);
        log.setSourcesHit(sourcesHit);
        repository.save(log);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logFailure(Long userId, String username, UUID conversationId, String question,
                           AiIntent intent, String sql, String errorMessage, long durationMs) {
        AiQueryLog log = baseLog(userId, username, conversationId, question, intent);
        log.setStatus(intent == AiIntent.DATA ? "REJECTED_SQL" : "FAILED");
        log.setSqlText(sql);
        log.setErrorMessage(errorMessage);
        log.setDurationMs(durationMs);
        repository.save(log);
    }

    private AiQueryLog baseLog(Long userId, String username, UUID conversationId,
                               String question, AiIntent intent) {
        AiQueryLog log = new AiQueryLog();
        log.setUserId(userId);
        log.setUsername(username);
        log.setConversationId(conversationId);
        log.setQuestion(question);
        log.setIntent(intent != null ? intent.name() : null);
        return log;
    }
}
