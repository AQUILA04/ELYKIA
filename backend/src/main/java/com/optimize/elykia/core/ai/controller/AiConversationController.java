package com.optimize.elykia.core.ai.controller;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.ai.context.AiUserContextBuilder;
import com.optimize.elykia.core.ai.conversation.AiConversationService;
import com.optimize.elykia.core.ai.conversation.entity.AiConversation;
import com.optimize.elykia.core.ai.dto.ConversationDetailDto;
import com.optimize.elykia.core.ai.dto.ConversationSummaryDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("api/v1/ai/conversations")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Elykia IA — Sessions")
@CrossOrigin
@ConditionalOnProperty(name = "elykia.ai.enabled", havingValue = "true")
@PreAuthorize("hasRole('ROLE_AI_CHAT')")
public class AiConversationController {

    private final AiConversationService conversationService;
    private final AiUserContextBuilder userContextBuilder;

    @GetMapping
    @Operation(summary = "Lister les sessions de l'utilisateur courant")
    public ResponseEntity<Response> list() {
        Long userId = userContextBuilder.build().getUserId();
        List<ConversationSummaryDto> sessions = conversationService.listForUser(userId);
        return new ResponseEntity<>(ResponseUtil.successResponse(sessions), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Messages d'une session")
    public ResponseEntity<Response> get(@PathVariable UUID id) {
        Long userId = userContextBuilder.build().getUserId();
        ConversationDetailDto detail = conversationService.getConversation(id, userId);
        return new ResponseEntity<>(ResponseUtil.successResponse(detail), HttpStatus.OK);
    }

    @PostMapping
    @Operation(summary = "Créer une nouvelle session")
    public ResponseEntity<Response> create() {
        Long userId = userContextBuilder.build().getUserId();
        AiConversation conversation = conversationService.createConversation(userId);
        ConversationSummaryDto summary = ConversationSummaryDto.builder()
                .id(conversation.getId())
                .title(conversation.getTitle())
                .status(conversation.getStatus())
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .build();
        return new ResponseEntity<>(ResponseUtil.successResponse(summary), HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une session")
    public ResponseEntity<Response> delete(@PathVariable UUID id) {
        Long userId = userContextBuilder.build().getUserId();
        conversationService.deleteConversation(id, userId);
        return new ResponseEntity<>(ResponseUtil.successResponse(null), HttpStatus.OK);
    }
}
