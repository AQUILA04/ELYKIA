package com.optimize.elykia.core.service.tontine;

import com.optimize.elykia.core.entity.tontine.TontineCollection;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TontineFieldControlRecordedByTest {

    private static final LocalDateTime OBSERVED_AT = LocalDateTime.of(2026, 8, 20, 10, 0);

    private TontineCollection collectionAt(LocalDateTime operationDate) {
        TontineCollection collection = new TontineCollection();
        collection.setOperationDate(operationDate);
        return collection;
    }

    @Test
    void collectionRecordedBeforeOrAtTheControlIsInTheSnapshot() {
        assertTrue(TontineMemberFieldControlService.recordedBy(collectionAt(OBSERVED_AT.minusMinutes(1)), OBSERVED_AT));
        assertTrue(TontineMemberFieldControlService.recordedBy(collectionAt(OBSERVED_AT), OBSERVED_AT));
    }

    @Test
    void collectionRecordedAfterTheControlIsOutOfTheSnapshot() {
        assertFalse(TontineMemberFieldControlService.recordedBy(collectionAt(OBSERVED_AT.plusSeconds(1)), OBSERVED_AT));
    }

    @Test
    void collectionWithoutOperationDateIsKept() {
        assertTrue(TontineMemberFieldControlService.recordedBy(collectionAt(null), OBSERVED_AT));
    }
}
