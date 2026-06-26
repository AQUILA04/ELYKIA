package com.optimize.elykia.core.ai.admin.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FrequentQuestionDto {
    private String question;
    private long count;
}
