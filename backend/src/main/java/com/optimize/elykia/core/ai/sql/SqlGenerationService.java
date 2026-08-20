package com.optimize.elykia.core.ai.sql;

import com.optimize.elykia.core.ai.config.AiProperties;
import com.optimize.elykia.core.ai.context.AiUserContext;
import com.optimize.elykia.core.ai.dto.SqlQueryResult;
import com.optimize.elykia.core.ai.schema.SchemaCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "elykia.ai.enabled", havingValue = "true")
@RequiredArgsConstructor
public class SqlGenerationService {

    private final ChatClient chatClient;
    private final SchemaCatalogService schemaCatalogService;
    private final SqlExamplesService sqlExamplesService;
    private final AiProperties aiProperties;

    public String generateSql(String question, AiUserContext context) {
        String examples = sqlExamplesService.formatExamplesForPrompt(question);
        String system = """
                GENERATE_SQL
                Tu es un expert PostgreSQL pour l'application ELYKIA (vente à crédit, recouvrement via credit_timeline, tontines).
                Génère UNIQUEMENT une requête SELECT PostgreSQL valide, sans markdown ni explication.
                Règles : SELECT uniquement, LIMIT <= 500, tables du schéma uniquement, recouvrement = credit_timeline.
                Schéma JSON :
                """ + schemaCatalogService.getCatalogForPrompt() + examples + """
                
                Date du jour : """ + context.getToday() + """
                Utilisateur : """ + context.getUsername();

        return cleanSql(chatClient.prompt()
                .system(system)
                .user(question)
                .call()
                .content());
    }

    public String fixSql(String question, String failedSql, String errorMessage, AiUserContext context) {
        String examples = sqlExamplesService.formatExamplesForPrompt(question);
        String system = """
                FIX_SQL
                Corrige la requête SQL PostgreSQL suivante pour ELYKIA.
                Réponds UNIQUEMENT avec le SQL corrigé (SELECT, LIMIT <= 500, tables autorisées).
                Recouvrement = table credit_timeline (pas recovery).
                Schéma : """ + schemaCatalogService.getCatalogForPrompt() + examples;

        String user = "Question: " + question + "\nSQL échoué:\n" + failedSql + "\nErreur:\n" + errorMessage;
        return cleanSql(chatClient.prompt()
                .system(system)
                .user(user)
                .call()
                .content());
    }

    public String formatDataAnswer(String question, SqlQueryResult result) {
        String system = """
                FORMAT_ANSWER
                Formate une réponse en français pour l'utilisateur à partir des données SQL.
                Ne invente aucun chiffre. Montants en FCFA. Sois concis et professionnel.""";

        String user = "Question: " + question + "\nColonnes: " + result.getColumns() + "\nDonnées: " + result.getRows();
        return chatClient.prompt()
                .system(system)
                .user(user)
                .call()
                .content();
    }

    private String cleanSql(String raw) {
        return raw.replace("```sql", "")
                .replace("```", "")
                .trim();
    }
}
