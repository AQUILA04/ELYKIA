package com.optimize.elykia.core.ai.dto;

import com.optimize.elykia.core.ai.enums.AiIntent;
import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Builder
public class AiChatResponse {

    private UUID conversationId;
    private String reply;
    private AiIntent intent;
    private Integer rowCount;
    private List<String> columns;
    private List<Map<String, Object>> preview;
    private List<GuideSourceDto> sources;
    private List<String> suggestions;
    private String sql;
}
