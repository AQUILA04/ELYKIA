package com.optimize.elykia.ai.web.dto;

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
