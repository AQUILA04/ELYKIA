package com.optimize.elykia.core.ai.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "elykia.ai")
public class AiProperties {

    private boolean enabled = false;
    private String provider = "stub";
    private String model = "qwen2.5-coder:7b";
    private int maxTokens = 4096;
    private int rateLimitPerUserPerMinute = 15;
    private int rateLimitPerUserPerDay = 20;
    private int rateLimitPerUserPerWeek = 120;

    private final Conversation conversation = new Conversation();
    private final Sql sql = new Sql();
    private final Help help = new Help();

    @Getter
    @Setter
    public static class Conversation {
        private int maxHistoryMessages = 20;
        private int retentionDays = 90;
    }

    @Getter
    @Setter
    public static class Sql {
        private int maxRows = 500;
        private int timeoutSeconds = 10;
        private int maxRetries = 2;
        private boolean exposeSqlToUser = false;
        private String examplesPath = "classpath:ai/sql-examples.json";
        private int maxFewShotExamples = 3;
    }

    @Getter
    @Setter
    public static class Help {
        private String userGuideIndexPath = "classpath:ai/user-guide-index.json";
        private int topKChunks = 5;
        private boolean embeddingSearchEnabled = false;
        private String embeddingModel = "nomic-embed-text";
    }
}
