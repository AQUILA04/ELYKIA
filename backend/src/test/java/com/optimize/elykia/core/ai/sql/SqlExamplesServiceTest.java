package com.optimize.elykia.core.ai.sql;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.elykia.core.ai.config.AiProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.DefaultResourceLoader;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SqlExamplesServiceTest {

    @Mock
    private AiProperties aiProperties;

    private SqlExamplesService sqlExamplesService;

    @BeforeEach
    void setUp() {
        AiProperties.Sql sql = new AiProperties.Sql();
        sql.setExamplesPath("classpath:ai/sql-examples.json");
        sql.setMaxFewShotExamples(2);
        when(aiProperties.getSql()).thenReturn(sql);
        sqlExamplesService = new SqlExamplesService(new ObjectMapper(), new DefaultResourceLoader(), aiProperties);
        sqlExamplesService.loadExamples();
    }

    @Test
    void loadsDomainsFromClasspath() {
        assertFalse(sqlExamplesService.getDomains().isEmpty());
    }

    @Test
    void selectsRecouvrementExamplesForRecouvrementQuestion() {
        var examples = sqlExamplesService.selectExamples("Quel est mon recouvrement du mois ?");
        assertFalse(examples.isEmpty());
        assertTrue(examples.get(0).sql().contains("credit_timeline"));
    }

    @Test
    void formatsExamplesForPrompt() {
        String prompt = sqlExamplesService.formatExamplesForPrompt("chiffre crédit du jour");
        assertTrue(prompt.contains("Exemples SQL"));
        assertTrue(prompt.contains("SELECT"));
    }
}
