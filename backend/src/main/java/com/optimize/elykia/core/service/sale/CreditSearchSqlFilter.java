package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.dto.CreditSearchDto;
import jakarta.persistence.Query;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Builds dynamic SQL fragments for credit search filters (native queries).
 */
final class CreditSearchSqlFilter {

    private final String creditAlias;
    private final StringBuilder sql = new StringBuilder();
    private final Map<String, Object> params = new LinkedHashMap<>();
    private int paramIndex = 0;

    private CreditSearchSqlFilter(String creditAlias) {
        this.creditAlias = creditAlias;
    }

    static CreditSearchSqlFilter from(CreditSearchDto dto, String creditAlias, boolean ignoreStatus) {
        CreditSearchSqlFilter filter = new CreditSearchSqlFilter(creditAlias);
        filter.apply(dto, ignoreStatus);
        return filter;
    }

    void applyTo(Query query) {
        params.forEach(query::setParameter);
    }

    String getSqlFragment() {
        return sql.toString();
    }

    Map<String, Object> getParams() {
        return params;
    }

    private void apply(CreditSearchDto dto, boolean ignoreStatus) {
        if (dto == null) {
            return;
        }

        if (!ignoreStatus && dto.status() != null) {
            appendEquals("status", dto.status().name());
        }

        if (dto.clientType() != null) {
            appendEquals("client_type", dto.clientType().name());
        }

        if (dto.type() != null) {
            appendEquals("type", dto.type().name());
        }

        if (StringUtils.hasText(dto.commercial())) {
            appendEquals("collector", dto.commercial().trim());
        }

        if (dto.clientId() != null) {
            String param = bind("clientId", dto.clientId());
            sql.append(" AND ").append(creditAlias).append(".client_id = :").append(param).append('\n');
        }

        if (StringUtils.hasText(dto.keyword())) {
            String kwParam = bind("keyword", dto.keyword().trim());
            String patternParam = bind("keywordPattern", "%" + dto.keyword().trim().toLowerCase() + "%");
            sql.append(" AND (")
                    .append("LOWER(").append(creditAlias).append(".reference) LIKE :").append(patternParam)
                    .append(" OR LOWER(").append(creditAlias).append(".old_reference) LIKE :").append(patternParam)
                    .append(" OR LOWER(").append(creditAlias).append(".collector) LIKE :").append(patternParam)
                    .append(" OR LOWER(CONCAT(cl.firstname, ' ', cl.lastname)) LIKE :").append(patternParam)
                    .append(" OR CAST(").append(creditAlias).append(".id AS TEXT) = :").append(kwParam)
                    .append(")\n");
        }
    }

    private void appendEquals(String column, Object value) {
        String param = bind(column, value);
        sql.append(" AND ").append(creditAlias).append('.').append(column).append(" = :").append(param).append('\n');
    }

    private String bind(String base, Object value) {
        String name = base + paramIndex++;
        params.put(name, value);
        return name;
    }
}
