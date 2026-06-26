package com.optimize.elykia.core.ai.config;

import com.optimize.elykia.core.ai.llm.StubChatModel;
import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.deepseek.DeepSeekChatModel;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.vertexai.gemini.VertexAiGeminiChatModel;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
@EnableConfigurationProperties(AiProperties.class)
@ConditionalOnProperty(name = "elykia.ai.enabled", havingValue = "true")
public class AiConfiguration {

    @Bean
    @Primary
    @ConditionalOnProperty(name = "elykia.ai.provider", havingValue = "stub", matchIfMissing = true)
    public ChatModel stubChatModel() {
        return new StubChatModel();
    }

    @Bean
    @Primary
    @ConditionalOnProperty(name = "elykia.ai.provider", havingValue = "ollama")
    public ChatModel ollamaChatModel(OllamaChatModel ollamaChatModel) {
        return ollamaChatModel;
    }

    @Bean
    @Primary
    @ConditionalOnProperty(name = "elykia.ai.provider", havingValue = "anthropic")
    public ChatModel anthropicChatModel(AnthropicChatModel anthropicChatModel) {
        return anthropicChatModel;
    }

    @Bean
    @Primary
    @ConditionalOnProperty(name = "elykia.ai.provider", havingValue = "openai")
    public ChatModel openAiChatModel(OpenAiChatModel openAiChatModel) {
        return openAiChatModel;
    }

    @Bean
    @Primary
    @ConditionalOnProperty(name = "elykia.ai.provider", havingValue = "gemini")
    public ChatModel geminiChatModel(VertexAiGeminiChatModel vertexAiGeminiChatModel) {
        return vertexAiGeminiChatModel;
    }

    @Bean
    @Primary
    @ConditionalOnProperty(name = "elykia.ai.provider", havingValue = "deepseek")
    public ChatModel deepSeekChatModel(DeepSeekChatModel deepSeekChatModel) {
        return deepSeekChatModel;
    }

    @Bean
    public ChatClient elykiaChatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel).build();
    }
}
