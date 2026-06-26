package com.optimize.elykia.core.ai.admin.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class IntentCountDto {
    private String intent;
    private long count;
}
