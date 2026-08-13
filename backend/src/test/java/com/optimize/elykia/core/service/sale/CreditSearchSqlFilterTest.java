package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.dto.CreditSearchDto;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CreditSearchSqlFilterTest {

    @Test
    void searchByReferenceRestrictsSqlToReferenceColumn() {
        CreditSearchDto dto = new CreditSearchDto("RAT-YVG7ZNJ3", null, null, null, null, null, true);

        CreditSearchSqlFilter filter = CreditSearchSqlFilter.from(dto, "c", false);

        String sql = filter.getSqlFragment();
        assertTrue(sql.contains(".reference) LIKE"));
        assertFalse(sql.contains("old_reference"));
        assertFalse(sql.contains("collector"));
    }

    @Test
    void defaultKeywordSearchIncludesMultipleColumns() {
        CreditSearchDto dto = new CreditSearchDto("RAT-YVG7ZNJ3", null, null, null, null, null, false);

        CreditSearchSqlFilter filter = CreditSearchSqlFilter.from(dto, "c", false);

        String sql = filter.getSqlFragment();
        assertTrue(sql.contains(".reference) LIKE"));
        assertTrue(sql.contains("old_reference"));
        assertTrue(sql.contains("collector"));
    }
}
