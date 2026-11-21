package com.optimize.elykia.ai.web.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FrequentQuestionDto {
    private String question;
    private long count;
}
