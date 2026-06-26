package com.optimize.elykia.core.ai.audit;

import com.optimize.elykia.core.ai.dto.AiChatResponse;
import com.optimize.elykia.core.ai.enums.AiIntent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@Slf4j
public class AiAuditService {

    public void logChat(Long userId, String username, UUID conversationId, String message, AiChatResponse response, long durationMs) {
        AiIntent intent = response != null ? response.getIntent() : null;
        Integer rowCount = response != null ? response.getRowCount() : null;
        log.info("ai.chat userId={} username={} conversationId={} intent={} rowCount={} durationMs={} messageLength={}",
                userId,
                username,
                conversationId,
                intent,
                rowCount,
                durationMs,
                message != null ? message.length() : 0);
    }

    public void logError(Long userId, String username, UUID conversationId, String message, String error, long durationMs) {
        log.warn("ai.chat.error userId={} username={} conversationId={} durationMs={} error={} messageLength={}",
                userId,
                username,
                conversationId,
                durationMs,
                error,
                message != null ? message.length() : 0);
    }
}
