package com.optimize.elykia.core.ai.sql;

import com.optimize.elykia.core.ai.config.AiProperties;
import com.optimize.elykia.core.ai.dto.SqlQueryResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.ColumnMapRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SqlExecutionService {

    private final JdbcTemplate jdbcTemplate;
    private final AiProperties aiProperties;

    public SqlQueryResult execute(String sql) {
        int timeoutSeconds = aiProperties.getSql().getTimeoutSeconds();
        jdbcTemplate.setQueryTimeout(timeoutSeconds);
        List<Map<String, Object>> rows = jdbcTemplate.query(sql, new ColumnMapRowMapper());
        int maxRows = aiProperties.getSql().getMaxRows();
        if (rows.size() > maxRows) {
            rows = new ArrayList<>(rows.subList(0, maxRows));
        }
        List<String> columns = rows.isEmpty()
                ? List.of()
                : new ArrayList<>(rows.get(0).keySet());
        List<Map<String, Object>> normalized = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            normalized.add(new LinkedHashMap<>(row));
        }
        return SqlQueryResult.builder()
                .columns(columns)
                .rows(normalized)
                .rowCount(normalized.size())
                .executedSql(sql)
                .build();
    }
}
