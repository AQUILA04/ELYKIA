package com.optimize.elykia.core.ai.sql;

import com.optimize.elykia.core.ai.config.AiProperties;
import com.optimize.elykia.core.ai.context.AiUserContext;
import com.optimize.elykia.core.ai.schema.SchemaCatalogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SqlRowLevelFilterTest {

    @Mock
    private SchemaCatalogService schemaCatalogService;

    private SqlRowLevelFilter filter;

    @BeforeEach
    void setUp() {
        AiProperties properties = new AiProperties();
        properties.getSql().setMaxRows(500);
        filter = new SqlRowLevelFilter(schemaCatalogService, properties);
    }

    @Test
    void injectsCollectorFilterForPromoter() {
        when(schemaCatalogService.tablesWithRowLevelFilter()).thenReturn(
                Map.of("credit_timeline", "collector", "credit", "collector"));
        AiUserContext ctx = AiUserContext.builder()
                .username("jdoe")
                .collectorScoped(true)
                .today(LocalDate.now())
                .build();
        String sql = "SELECT SUM(amount) FROM credit_timeline GROUP BY collector";
        String result = filter.apply(sql, ctx);
        assertTrue(result.toLowerCase().contains("collector = 'jdoe'"));
        assertTrue(result.toLowerCase().contains("limit 500"));
    }

    @Test
    void noFilterForAdmin() {
        AiUserContext ctx = AiUserContext.builder()
                .username("admin")
                .collectorScoped(false)
                .today(LocalDate.now())
                .build();
        String sql = "SELECT COUNT(*) FROM credit";
        String result = filter.apply(sql, ctx);
        assertFalse(result.contains("collector = 'admin'"));
        assertTrue(result.toLowerCase().contains("limit 500"));
    }
}
