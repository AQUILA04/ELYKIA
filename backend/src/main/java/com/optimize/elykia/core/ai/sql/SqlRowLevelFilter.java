package com.optimize.elykia.core.ai.sql;

import com.optimize.elykia.core.ai.config.AiProperties;
import com.optimize.elykia.core.ai.context.AiUserContext;
import com.optimize.elykia.core.ai.schema.SchemaCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class SqlRowLevelFilter {

    private static final Pattern LIMIT_PATTERN = Pattern.compile("\\blimit\\s+\\d+", Pattern.CASE_INSENSITIVE);

    private final SchemaCatalogService schemaCatalogService;
    private final AiProperties aiProperties;

    public String apply(String sql, AiUserContext context) {
        if (!context.isCollectorScoped()) {
            return ensureLimit(sql);
        }
        String lower = sql.toLowerCase(Locale.ROOT);
        Map<String, String> filterTables = schemaCatalogService.tablesWithRowLevelFilter();
        String escapedUsername = context.getUsername().replace("'", "''");
        String result = sql;
        for (Map.Entry<String, String> entry : filterTables.entrySet()) {
            if (lower.contains(entry.getKey())) {
                String filter = entry.getValue() + " = '" + escapedUsername + "'";
                result = injectRowLevelFilter(result, filter);
                lower = result.toLowerCase(Locale.ROOT);
            }
        }
        return ensureLimit(result);
    }

    private String injectRowLevelFilter(String sql, String filter) {
        String lower = sql.toLowerCase(Locale.ROOT);
        int whereIdx = lower.indexOf(" where ");
        if (whereIdx >= 0) {
            int insertAt = whereIdx + " where ".length();
            return sql.substring(0, insertAt) + filter + " AND " + sql.substring(insertAt);
        }
        int orderIdx = lower.indexOf(" order by ");
        int groupIdx = lower.indexOf(" group by ");
        int limitIdx = lower.indexOf(" limit ");
        int insertAt = sql.length();
        if (orderIdx >= 0) insertAt = Math.min(insertAt, orderIdx);
        if (groupIdx >= 0) insertAt = Math.min(insertAt, groupIdx);
        if (limitIdx >= 0) insertAt = Math.min(insertAt, limitIdx);
        return sql.substring(0, insertAt) + " WHERE " + filter + " " + sql.substring(insertAt);
    }

    private String ensureLimit(String sql) {
        if (LIMIT_PATTERN.matcher(sql).find()) {
            return sql;
        }
        return sql.trim() + " LIMIT " + aiProperties.getSql().getMaxRows();
    }
}
