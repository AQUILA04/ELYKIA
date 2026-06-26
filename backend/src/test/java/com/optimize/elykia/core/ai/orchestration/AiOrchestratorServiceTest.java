package com.optimize.elykia.core.ai.orchestration;

import com.optimize.elykia.core.ai.config.AiProperties;
import com.optimize.elykia.core.ai.context.AiUserContext;
import com.optimize.elykia.core.ai.context.AiUserContextBuilder;
import com.optimize.elykia.core.ai.conversation.AiConversationService;
import com.optimize.elykia.core.ai.conversation.entity.AiMessage;
import com.optimize.elykia.core.ai.dto.AiChatResponse;
import com.optimize.elykia.core.ai.dto.GuideSourceDto;
import com.optimize.elykia.core.ai.dto.SqlQueryResult;
import com.optimize.elykia.core.ai.enums.AiIntent;
import com.optimize.elykia.core.ai.help.UserGuideRagService;
import com.optimize.elykia.core.ai.metrics.AiMetricsService;
import com.optimize.elykia.core.ai.audit.AiQueryLogService;
import com.optimize.elykia.core.ai.sql.*;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiOrchestratorServiceTest {

    @Mock private AiUserContextBuilder userContextBuilder;
    @Mock private IntentClassifier intentClassifier;
    @Mock private SqlGenerationService sqlGenerationService;
    @Mock private SqlValidator sqlValidator;
    @Mock private SqlRowLevelFilter sqlRowLevelFilter;
    @Mock private SqlExecutionService sqlExecutionService;
    @Mock private UserGuideRagService userGuideRagService;
    @Mock private AiConversationService conversationService;
    @Mock private AiProperties aiProperties;
    @Mock private AiMetricsService metricsService;
    @Mock private AiQueryLogService queryLogService;

    @InjectMocks
    private AiOrchestratorService orchestratorService;

    private final UUID conversationId = UUID.randomUUID();
    private AiUserContext context;

    @BeforeEach
    void setUp() {
        context = AiUserContext.builder()
                .userId(1L)
                .username("manager")
                .collectorScoped(false)
                .today(LocalDate.now())
                .build();
        when(userContextBuilder.build()).thenReturn(context);
        when(conversationService.appendMessage(any(), anyLong(), any(), any(), any(), any()))
                .thenReturn(new AiMessage());
    }

    @Test
    void routesHowToToRag() {
        when(intentClassifier.classify("Comment créer un crédit ?")).thenReturn(AiIntent.HOW_TO);
        when(userGuideRagService.answer(anyString())).thenReturn(
                new UserGuideRagService.UserGuideAnswer("Étapes...", List.of(
                        GuideSourceDto.builder().title("Guide").url("/user-guide/test.html").build())));

        AiChatResponse response = orchestratorService.process(conversationId, "Comment créer un crédit ?");

        assertEquals(AiIntent.HOW_TO, response.getIntent());
        assertNotNull(response.getSources());
        verify(sqlGenerationService, never()).generateSql(anyString(), any());
    }

    @Test
    void routesDataToSqlPipeline() {
        AiProperties.Sql sql = new AiProperties.Sql();
        sql.setMaxRetries(1);
        when(aiProperties.getSql()).thenReturn(sql);
        when(metricsService.startSqlTimer()).thenReturn(Timer.start(new SimpleMeterRegistry()));
        when(intentClassifier.classify("Chiffre du jour")).thenReturn(AiIntent.DATA);
        when(sqlGenerationService.generateSql(anyString(), eq(context))).thenReturn(
                "SELECT SUM(total_amount) FROM credit WHERE date_reg = CURRENT_DATE LIMIT 1");
        when(sqlRowLevelFilter.apply(anyString(), eq(context))).thenReturn(
                "SELECT SUM(total_amount) FROM credit WHERE date_reg = CURRENT_DATE LIMIT 1");
        when(sqlExecutionService.execute(anyString())).thenReturn(SqlQueryResult.builder()
                .columns(List.of("sum"))
                .rows(List.of(Map.of("sum", 1000)))
                .rowCount(1)
                .build());
        when(sqlGenerationService.formatDataAnswer(anyString(), any())).thenReturn("Le chiffre du jour est 1 000 FCFA.");

        AiChatResponse response = orchestratorService.process(conversationId, "Chiffre du jour");

        assertEquals(AiIntent.DATA, response.getIntent());
        assertEquals(1, response.getRowCount());
        verify(sqlValidator).validate(anyString());
    }
}
