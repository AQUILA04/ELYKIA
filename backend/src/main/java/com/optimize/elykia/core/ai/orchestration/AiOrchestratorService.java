package com.optimize.elykia.core.ai.orchestration;

import com.optimize.elykia.core.ai.audit.AiQueryLogService;
import com.optimize.elykia.core.ai.config.AiProperties;
import com.optimize.elykia.core.ai.context.AiUserContext;
import com.optimize.elykia.core.ai.context.AiUserContextBuilder;
import com.optimize.elykia.core.ai.conversation.AiConversationService;
import com.optimize.elykia.core.ai.dto.AiChatResponse;
import com.optimize.elykia.core.ai.dto.SqlQueryResult;
import com.optimize.elykia.core.ai.enums.AiIntent;
import com.optimize.elykia.core.ai.enums.AiMessageRole;
import com.optimize.elykia.core.ai.help.UserGuideRagService;
import com.optimize.elykia.core.ai.metrics.AiMetricsService;
import com.optimize.elykia.core.ai.sql.*;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "elykia.ai.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class AiOrchestratorService {

    private final AiUserContextBuilder userContextBuilder;
    private final IntentClassifier intentClassifier;
    private final SqlGenerationService sqlGenerationService;
    private final SqlValidator sqlValidator;
    private final SqlRowLevelFilter sqlRowLevelFilter;
    private final SqlExecutionService sqlExecutionService;
    private final UserGuideRagService userGuideRagService;
    private final AiConversationService conversationService;
    private final AiProperties aiProperties;
    private final AiMetricsService metricsService;
    private final AiQueryLogService queryLogService;

    @Transactional
    public AiChatResponse process(UUID conversationId, String userMessage) {
        AiUserContext context = userContextBuilder.build();
        long startMs = System.currentTimeMillis();
        conversationService.appendMessage(conversationId, context.getUserId(),
                AiMessageRole.USER, userMessage, null, null);

        AiIntent intent = intentClassifier.classify(userMessage);
        metricsService.recordIntent(intent);
        try {
            return switch (intent) {
                case HOW_TO -> processHowTo(conversationId, context, userMessage, startMs);
                case DATA -> processData(conversationId, context, userMessage, startMs);
            };
        } catch (Exception e) {
            if (intent == AiIntent.HOW_TO) {
                long durationMs = System.currentTimeMillis() - startMs;
                queryLogService.logFailure(context.getUserId(), context.getUsername(), conversationId,
                        userMessage, intent, null, e.getMessage(), durationMs);
                metricsService.recordQueryStatus("FAILED");
            }
            throw e;
        }
    }

    private AiChatResponse processHowTo(UUID conversationId, AiUserContext context, String userMessage, long startMs) {
        var answer = userGuideRagService.answer(userMessage);
        metricsService.recordHelpSourcesHit(answer.sources().size());
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("sources", answer.sources());
        conversationService.appendMessage(conversationId, context.getUserId(),
                AiMessageRole.ASSISTANT, answer.reply(), AiIntent.HOW_TO.name(), metadata);
        long durationMs = System.currentTimeMillis() - startMs;
        queryLogService.logSuccess(context.getUserId(), context.getUsername(), conversationId,
                userMessage, AiIntent.HOW_TO, null, durationMs, null, answer.sources().size());
        metricsService.recordQueryStatus("SUCCESS");
        return AiChatResponse.builder()
                .conversationId(conversationId)
                .reply(answer.reply())
                .intent(AiIntent.HOW_TO)
                .sources(answer.sources())
                .build();
    }

    private AiChatResponse processData(UUID conversationId, AiUserContext context, String userMessage, long startMs) {
        Timer.Sample sqlTimer = metricsService.startSqlTimer();
        String sql = sqlGenerationService.generateSql(userMessage, context);
        SqlQueryResult result = null;
        String lastError = null;
        int maxRetries = aiProperties.getSql().getMaxRetries();
        boolean sqlSuccess = false;

        try {
            for (int attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    sqlValidator.validate(sql);
                    String securedSql = sqlRowLevelFilter.apply(sql, context);
                    result = sqlExecutionService.execute(securedSql);
                    sql = securedSql;
                    sqlSuccess = true;
                    break;
                } catch (SqlValidationException e) {
                    lastError = e.getMessage();
                    if (attempt >= maxRetries) {
                        throw e;
                    }
                    sql = sqlGenerationService.fixSql(userMessage, sql, lastError, context);
                } catch (DataAccessException e) {
                    lastError = e.getMostSpecificCause().getMessage();
                    log.warn("SQL execution failed (attempt {}): {}", attempt + 1, lastError);
                    if (attempt >= maxRetries) {
                        throw new SqlValidationException("Exécution SQL échouée : " + lastError);
                    }
                    sql = sqlGenerationService.fixSql(userMessage, sql, lastError, context);
                }
            }

            if (result == null) {
                throw new SqlValidationException("Impossible d'exécuter la requête.");
            }

            String reply = sqlGenerationService.formatDataAnswer(userMessage, result);
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("rowCount", result.getRowCount());
            metadata.put("columns", result.getColumns());
            metadata.put("preview", result.getRows());
            if (aiProperties.getSql().isExposeSqlToUser()) {
                metadata.put("sql", sql);
            }
            conversationService.appendMessage(conversationId, context.getUserId(),
                    AiMessageRole.ASSISTANT, reply, AiIntent.DATA.name(), metadata);

            long durationMs = System.currentTimeMillis() - startMs;
            queryLogService.logSuccess(context.getUserId(), context.getUsername(), conversationId,
                    userMessage, AiIntent.DATA, sql, durationMs, result.getRowCount(), null);
            metricsService.recordQueryStatus("SUCCESS");

            return AiChatResponse.builder()
                    .conversationId(conversationId)
                    .reply(reply)
                    .intent(AiIntent.DATA)
                    .rowCount(result.getRowCount())
                    .columns(result.getColumns())
                    .preview(result.getRows())
                    .sql(aiProperties.getSql().isExposeSqlToUser() ? sql : null)
                    .build();
        } catch (Exception e) {
            long durationMs = System.currentTimeMillis() - startMs;
            queryLogService.logFailure(context.getUserId(), context.getUsername(), conversationId,
                    userMessage, AiIntent.DATA, sql, e.getMessage(), durationMs);
            metricsService.recordQueryStatus("REJECTED_SQL");
            throw e;
        } finally {
            metricsService.recordSqlLatency(sqlTimer, sqlSuccess);
        }
    }
}
