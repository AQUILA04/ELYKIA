package com.optimize.elykia.core.ai.orchestration;

import com.optimize.elykia.core.ai.enums.AiIntent;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
@RequiredArgsConstructor
public class IntentClassifier {

    private final ChatClient chatClient;

    public AiIntent classify(String message) {
        String quick = message.toLowerCase(Locale.FRENCH);
        if (quick.contains("comment") || quick.startsWith("où ") || quick.startsWith("ou ")
                || quick.contains("comment faire") || quick.contains("guide")) {
            return AiIntent.HOW_TO;
        }
        String result = chatClient.prompt()
                .system("CLASSIFY_INTENT Réponds uniquement DATA ou HOW_TO.")
                .user(message)
                .call()
                .content()
                .trim()
                .toUpperCase(Locale.ROOT);
        if (result.contains("HOW_TO")) {
            return AiIntent.HOW_TO;
        }
        return AiIntent.DATA;
    }
}
