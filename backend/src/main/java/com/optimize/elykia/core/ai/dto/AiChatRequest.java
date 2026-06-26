package com.optimize.elykia.core.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class AiChatRequest {

    @NotNull
    private UUID conversationId;

    @NotBlank
    private String message;
}
