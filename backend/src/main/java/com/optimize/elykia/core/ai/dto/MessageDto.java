package com.optimize.elykia.core.ai.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Builder
public class MessageDto {
    private UUID id;
    private String role;
    private String content;
    private String intent;
    private Map<String, Object> metadata;
    private LocalDateTime createdAt;
}
