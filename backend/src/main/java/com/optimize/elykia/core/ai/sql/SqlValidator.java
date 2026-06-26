package com.optimize.elykia.core.ai.sql;

import com.optimize.elykia.core.ai.schema.SchemaCatalogService;
import lombok.RequiredArgsConstructor;
import net.sf.jsqlparser.JSQLParserException;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.Statement;
import net.sf.jsqlparser.statement.select.Select;
import net.sf.jsqlparser.util.TablesNamesFinder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class SqlValidator {

    private static final Pattern MULTI_STATEMENT = Pattern.compile(";");
    private static final Set<String> FORBIDDEN_KEYWORDS = Set.of(
            "insert", "update", "delete", "drop", "alter", "create", "truncate",
            "grant", "revoke", "copy", "call", "merge", "pg_sleep", "pg_read_file"
    );

    private final SchemaCatalogService schemaCatalogService;

    public void validate(String sql) {
        if (sql == null || sql.isBlank()) {
            throw new SqlValidationException("Requête SQL vide.");
        }
        String trimmed = sql.trim();
        if (MULTI_STATEMENT.matcher(trimmed).find()) {
            throw new SqlValidationException("Une seule instruction SQL est autorisée.");
        }
        String lower = trimmed.toLowerCase(Locale.ROOT);
        for (String forbidden : FORBIDDEN_KEYWORDS) {
            if (lower.contains(forbidden)) {
                throw new SqlValidationException("Mot-clé SQL interdit : " + forbidden);
            }
        }
        if (!lower.startsWith("select") && !lower.startsWith("with")) {
            throw new SqlValidationException("Seules les requêtes SELECT sont autorisées.");
        }
        try {
            Statement statement = CCJSqlParserUtil.parse(trimmed);
            if (!(statement instanceof Select)) {
                throw new SqlValidationException("Seules les requêtes SELECT sont autorisées.");
            }
            TablesNamesFinder finder = new TablesNamesFinder();
            List<String> tables = finder.getTableList(statement);
            for (String table : tables) {
                String bare = table.replace("\"", "").toLowerCase();
                if (bare.contains(".")) {
                    bare = bare.substring(bare.lastIndexOf('.') + 1);
                }
                if (!schemaCatalogService.isTableAllowed(bare)) {
                    throw new SqlValidationException("Table non autorisée : " + bare);
                }
            }
        } catch (JSQLParserException e) {
            throw new SqlValidationException("SQL invalide : " + e.getMessage());
        }
    }
}
