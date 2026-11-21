package com.optimize.elykia.ai.web.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class ConversationSummaryDto {
    private UUID id;
    private String title;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
