package com.optimize.elykia.core.ai.help;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "elykia.ai.enabled", havingValue = "true")
@RequiredArgsConstructor
public class UserGuideAnswerFormatter {

    private final ChatClient chatClient;

    public String format(String question, String context) {
        return chatClient.prompt()
                .system("""
                        HOW_TO
                        Tu es l'assistant Elykia IA. Réponds en français avec des étapes claires.
                        Utilise UNIQUEMENT le contexte documentation fourni. Si insuffisant, dis-le.""")
                .user("Question: " + question + "\n\nDocumentation:\n" + context)
                .call()
                .content();
    }
}
