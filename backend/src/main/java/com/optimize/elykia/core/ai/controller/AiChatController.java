package com.optimize.elykia.core.ai.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.ai.audit.AiAuditService;
import com.optimize.elykia.core.ai.context.AiUserContext;
import com.optimize.elykia.core.ai.context.AiUserContextBuilder;
import com.optimize.elykia.core.ai.conversation.AiConversationService;
import com.optimize.elykia.core.ai.dto.AiChatRequest;
import com.optimize.elykia.core.ai.dto.AiChatResponse;
import com.optimize.elykia.core.ai.orchestration.AiOrchestratorService;
import com.optimize.elykia.core.ai.security.AiRateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/ai")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Elykia IA")
@CrossOrigin
@ConditionalOnProperty(name = "elykia.ai.enabled", havingValue = "true")
@PreAuthorize("hasRole('ROLE_AI_CHAT')")
public class AiChatController {

    private final AiOrchestratorService orchestratorService;
    private final AiConversationService conversationService;
    private final AiUserContextBuilder userContextBuilder;
    private final AiRateLimiter rateLimiter;
    private final AiAuditService auditService;

    @PostMapping("/chat")
    @Operation(summary = "Envoyer un message dans une session de conversation")
    public ResponseEntity<Response> chat(@Valid @RequestBody AiChatRequest request) {
        AiUserContext context = userContextBuilder.build();
        rateLimiter.check(context.getUserId());
        long start = System.currentTimeMillis();
        try {
            conversationService.getConversation(request.getConversationId(), context.getUserId());
            AiChatResponse response = orchestratorService.process(request.getConversationId(), request.getMessage());
            auditService.logChat(context.getUserId(), context.getUsername(), request.getConversationId(),
                    request.getMessage(), response, System.currentTimeMillis() - start);
            return new ResponseEntity<>(ResponseUtil.successResponse(response), HttpStatus.OK);
        } catch (RuntimeException ex) {
            auditService.logError(context.getUserId(), context.getUsername(), request.getConversationId(),
                    request.getMessage(), ex.getMessage(), System.currentTimeMillis() - start);
            throw ex;
        }
    }
}
