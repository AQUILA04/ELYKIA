package com.optimize.elykia.core.ai.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

/**
 * Aligne l'auto-config Spring AI sur {@code elykia.ai.provider} pour que les starters cloud
 * (OpenAI, DeepSeek, Anthropic, …) ne s'initialisent pas sans clé API lorsque le provider
 * n'est pas sélectionné.
 */
public class AiProviderEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE = "elykiaAiSpringAiModels";
    private static final String NONE = "none";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, Object> properties = new HashMap<>();
        disableOptionalModelTypes(properties);

        if (!Boolean.parseBoolean(environment.getProperty("elykia.ai.enabled", "false"))) {
            properties.put("spring.ai.model.chat", NONE);
            addPropertySource(environment, properties);
            return;
        }

        String provider = environment.getProperty("elykia.ai.provider", "stub");
        properties.put("spring.ai.model.chat", resolveChatModel(provider));

        boolean embeddingSearch = Boolean.parseBoolean(
                environment.getProperty("elykia.ai.help.embedding-search-enabled", "false"));
        properties.put("spring.ai.model.embedding", embeddingSearch ? "ollama" : NONE);

        if ("ollama".equals(provider) || embeddingSearch) {
            properties.put("spring.ai.ollama.enabled", true);
        }

        addPropertySource(environment, properties);
    }

    private static String resolveChatModel(String provider) {
        return switch (provider) {
            case "ollama" -> "ollama";
            case "anthropic" -> "anthropic";
            case "openai" -> "openai";
            case "gemini" -> "vertexai";
            case "deepseek" -> "deepseek";
            default -> NONE;
        };
    }

    private static void disableOptionalModelTypes(Map<String, Object> properties) {
        properties.put("spring.ai.model.audio.speech", NONE);
        properties.put("spring.ai.model.audio.transcription", NONE);
        properties.put("spring.ai.model.image", NONE);
        properties.put("spring.ai.model.moderation", NONE);
        properties.put("spring.ai.model.embedding.multimodal", NONE);
        properties.put("spring.ai.model.embedding.text", NONE);
    }

    private static void addPropertySource(ConfigurableEnvironment environment, Map<String, Object> properties) {
        environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE, properties));
    }

    @Override
    public int getOrder() {
        // Après le chargement de application.yml (elykia.ai.provider doit être lu).
        return Ordered.LOWEST_PRECEDENCE;
    }
}
