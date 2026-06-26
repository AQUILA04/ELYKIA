package com.optimize.elykia.core.ai.llm;

import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;

import java.util.List;
import java.util.Locale;

/**
 * Modèle déterministe pour dev/CI sans Ollama ni clé API cloud.
 */
public class StubChatModel implements ChatModel {

    @Override
    public ChatResponse call(Prompt prompt) {
        String userText = extractUserText(prompt);
        String systemText = extractSystemText(prompt);
        String reply = buildReply(systemText, userText);
        return new ChatResponse(List.of(new Generation(new AssistantMessage(reply))));
    }

    private String extractUserText(Prompt prompt) {
        return prompt.getInstructions().stream()
                .filter(m -> "user".equalsIgnoreCase(m.getMessageType().name()))
                .map(Message::getText)
                .reduce((first, second) -> second)
                .orElse("");
    }

    private String extractSystemText(Prompt prompt) {
        return prompt.getInstructions().stream()
                .filter(m -> "system".equalsIgnoreCase(m.getMessageType().name()))
                .map(Message::getText)
                .findFirst()
                .orElse("");
    }

    private String buildReply(String systemText, String userText) {
        String lower = userText.toLowerCase(Locale.FRENCH);
        if (systemText.contains("CLASSIFY_INTENT")) {
            if (lower.contains("comment") || lower.contains("où ") || lower.contains("ou ") || lower.contains("faire")) {
                return "HOW_TO";
            }
            return "DATA";
        }
        if (systemText.contains("GENERATE_SQL")) {
            if (lower.contains("recouvrement") || lower.contains("mise")) {
                return """
                        SELECT collector, SUM(amount) AS montant_recouvre
                        FROM credit_timeline
                        WHERE date_reg >= CURRENT_DATE - INTERVAL '7 days'
                        GROUP BY collector
                        ORDER BY montant_recouvre DESC
                        LIMIT 5
                        """;
            }
            return """
                    SELECT COALESCE(SUM(total_amount), 0) AS chiffre_jour, COUNT(*) AS nb_ventes
                    FROM credit
                    WHERE date_reg = CURRENT_DATE AND type = 'CREDIT'
                    LIMIT 1
                    """;
        }
        if (systemText.contains("FORMAT_ANSWER") || systemText.contains("HOW_TO")) {
            return "Voici les informations demandées basées sur les données disponibles. "
                    + "(Réponse stub — connectez Ollama pour des réponses enrichies.)";
        }
        if (systemText.contains("FIX_SQL")) {
            return """
                    SELECT COALESCE(SUM(total_amount), 0) AS chiffre_jour
                    FROM credit
                    WHERE date_reg = CURRENT_DATE
                    LIMIT 1
                    """;
        }
        return "Réponse stub Elykia IA.";
    }
}
