package com.optimize.elykia.core.service.tontine;

import com.optimize.elykia.core.entity.tontine.TontineCollection;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TontineFieldControlSnapshotBoundTest {

    private static final LocalDateTime SNAPSHOT = LocalDateTime.of(2026, 8, 20, 10, 0);

    @Test
    void collectionRecordedAfterTheControlSnapshotIsNotPartOfTheControl() {
        TontineCollection after = new TontineCollection();
        after.setCreatedDate(SNAPSHOT.plusMinutes(1));

        assertFalse(TontineService.recordedBy(after, SNAPSHOT));
    }

    @Test
    void collectionRecordedAtOrBeforeTheSnapshotIsPartOfTheControl() {
        TontineCollection before = new TontineCollection();
        before.setCreatedDate(SNAPSHOT.minusDays(2));
        TontineCollection exactly = new TontineCollection();
        exactly.setCreatedDate(SNAPSHOT);

        assertTrue(TontineService.recordedBy(before, SNAPSHOT));
        assertTrue(TontineService.recordedBy(exactly, SNAPSHOT));
    }

    @Test
    void withoutBoundOrAuditDateEveryCollectionIsKept() {
        TontineCollection undated = new TontineCollection();
        undated.setCreatedDate(null);
        TontineCollection dated = new TontineCollection();
        dated.setCreatedDate(SNAPSHOT.plusYears(1));

        assertTrue(TontineService.recordedBy(undated, SNAPSHOT));
        assertTrue(TontineService.recordedBy(dated, null));
    }
}
