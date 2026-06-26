package com.optimize.elykia.core.ai.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
@Builder
public class SqlQueryResult {
    private List<String> columns;
    private List<Map<String, Object>> rows;
    private int rowCount;
    private String executedSql;
}
