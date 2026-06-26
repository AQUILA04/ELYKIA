package com.optimize.elykia.core.ai.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Builder
public class ConversationDetailDto {
    private UUID id;
    private String title;
    private List<MessageDto> messages;
}
