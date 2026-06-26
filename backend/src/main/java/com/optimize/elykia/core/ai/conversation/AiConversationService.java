package com.optimize.elykia.core.ai.conversation;

import com.optimize.elykia.core.ai.conversation.entity.AiConversation;
import com.optimize.elykia.core.ai.conversation.entity.AiMessage;
import com.optimize.elykia.core.ai.conversation.repository.AiConversationRepository;
import com.optimize.elykia.core.ai.conversation.repository.AiMessageRepository;
import com.optimize.elykia.core.ai.dto.ConversationDetailDto;
import com.optimize.elykia.core.ai.dto.ConversationSummaryDto;
import com.optimize.elykia.core.ai.dto.MessageDto;
import com.optimize.elykia.core.ai.enums.AiMessageRole;
import com.optimize.common.entities.exception.CustomValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AiConversationService {

    private final AiConversationRepository conversationRepository;
    private final AiMessageRepository messageRepository;

    @Transactional(readOnly = true)
    public List<ConversationSummaryDto> listForUser(Long userId) {
        return conversationRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public ConversationDetailDto getConversation(UUID conversationId, Long userId) {
        AiConversation conversation = getOwnedConversation(conversationId, userId);
        List<MessageDto> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId).stream()
                .map(this::toMessageDto)
                .toList();
        return ConversationDetailDto.builder()
                .id(conversation.getId())
                .title(conversation.getTitle())
                .messages(messages)
                .build();
    }

    public AiConversation createConversation(Long userId) {
        AiConversation conversation = new AiConversation();
        conversation.setUserId(userId);
        conversation.setTitle("Nouvelle discussion");
        return conversationRepository.save(conversation);
    }

    public void deleteConversation(UUID conversationId, Long userId) {
        AiConversation conversation = getOwnedConversation(conversationId, userId);
        conversationRepository.delete(conversation);
    }

    public AiMessage appendMessage(UUID conversationId, Long userId, AiMessageRole role,
                                   String content, String intent, Map<String, Object> metadata) {
        AiConversation conversation = getOwnedConversation(conversationId, userId);
        AiMessage message = new AiMessage();
        message.setConversationId(conversation.getId());
        message.setRole(role.name());
        message.setContent(content);
        message.setIntent(intent);
        message.setMetadata(metadata);
        if (conversation.getTitle() == null || "Nouvelle discussion".equals(conversation.getTitle())) {
            if (role == AiMessageRole.USER && content != null && !content.isBlank()) {
                conversation.setTitle(truncateTitle(content));
            }
        }
        conversationRepository.save(conversation);
        return messageRepository.save(message);
    }

    @Transactional(readOnly = true)
    public List<AiMessage> getRecentMessages(UUID conversationId, int limit) {
        List<AiMessage> all = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        if (all.size() <= limit) {
            return all;
        }
        return all.subList(all.size() - limit, all.size());
    }

    private AiConversation getOwnedConversation(UUID conversationId, Long userId) {
        AiConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new CustomValidationException("Conversation introuvable."));
        if (!conversation.getUserId().equals(userId)) {
            throw new CustomValidationException("Accès refusé à cette conversation.");
        }
        return conversation;
    }

    private String truncateTitle(String content) {
        String trimmed = content.trim();
        return trimmed.length() > 60 ? trimmed.substring(0, 57) + "..." : trimmed;
    }

    private ConversationSummaryDto toSummary(AiConversation c) {
        return ConversationSummaryDto.builder()
                .id(c.getId())
                .title(c.getTitle())
                .status(c.getStatus())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    private MessageDto toMessageDto(AiMessage m) {
        return MessageDto.builder()
                .id(m.getId())
                .role(m.getRole())
                .content(m.getContent())
                .intent(m.getIntent())
                .metadata(m.getMetadata())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
