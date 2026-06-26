package com.optimize.elykia.core.ai.sql;

import com.optimize.elykia.core.ai.schema.SchemaCatalogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SqlValidatorTest {

    @Mock
    private SchemaCatalogService schemaCatalogService;

    private SqlValidator validator;

    @BeforeEach
    void setUp() {
        validator = new SqlValidator(schemaCatalogService);
    }

    @Test
    void acceptsValidSelect() {
        when(schemaCatalogService.isTableAllowed("credit")).thenReturn(true);
        assertDoesNotThrow(() -> validator.validate(
                "SELECT id, total_amount FROM credit WHERE date_reg = CURRENT_DATE LIMIT 10"));
    }

    @Test
    void rejectsDelete() {
        SqlValidationException ex = assertThrows(SqlValidationException.class,
                () -> validator.validate("DELETE FROM credit WHERE id = 1"));
        assertTrue(ex.getMessage().contains("interdit") || ex.getMessage().contains("SELECT"));
    }

    @Test
    void rejectsDisallowedTable() {
        when(schemaCatalogService.isTableAllowed("users")).thenReturn(false);
        SqlValidationException ex = assertThrows(SqlValidationException.class,
                () -> validator.validate("SELECT * FROM users"));
        assertTrue(ex.getMessage().contains("non autorisée"));
    }

    @Test
    void rejectsMultiStatement() {
        assertThrows(SqlValidationException.class,
                () -> validator.validate("SELECT 1; DROP TABLE credit"));
    }
}
