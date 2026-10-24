package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.elykia.core.enumaration.CarnetEcartStatus;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.enumaration.RmFieldListProgress;
import com.optimize.elykia.core.repository.RmFieldListProgressSql;
import com.optimize.elykia.core.service.sale.RmFieldProgressRules.Bucket;
import com.optimize.elykia.core.service.sale.RmFieldProgressRules.Snapshot;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RmFieldProgressRulesTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 24, 12, 0);

    @Test
    void neverControlledIsTodoOnly() {
        Snapshot none = new Snapshot(false, null, false);

        assertEquals(Bucket.TODO, RmFieldProgressRules.classify(none, NOW));
        assertTrue(RmFieldProgressRules.matches(RmFieldListProgress.TODO, none, NOW));
        assertTrue(RmFieldProgressRules.matches(RmFieldListProgress.ALL, none, NOW));
        assertFalse(RmFieldProgressRules.matches(RmFieldListProgress.DONE, none, NOW));
    }

    @Test
    void closedControlInsideThirtyDaysIsDone() {
        Snapshot recent = new Snapshot(true, NOW.minusDays(10), false);

        assertEquals(Bucket.DONE, RmFieldProgressRules.classify(recent, NOW));
        assertFalse(RmFieldProgressRules.matches(RmFieldListProgress.TODO, recent, NOW));
        assertTrue(RmFieldProgressRules.matches(RmFieldListProgress.DONE, recent, NOW));
    }

    @Test
    void boundaryOfThirtyDaysStaysDone() {
        assertTrue(RmFieldProgressRules.isRecent(NOW.minusDays(30), NOW));
        assertFalse(RmFieldProgressRules.isRecent(NOW.minusDays(30).minusSeconds(1), NOW));
    }

    @Test
    void closedControlOlderThanThirtyDaysIsVisibleInAllOnly() {
        Snapshot archived = new Snapshot(true, NOW.minusDays(31), false);

        assertEquals(Bucket.ALL_ONLY, RmFieldProgressRules.classify(archived, NOW));
        assertTrue(RmFieldProgressRules.matches(RmFieldListProgress.ALL, archived, NOW));
        assertFalse(RmFieldProgressRules.matches(RmFieldListProgress.TODO, archived, NOW));
        assertFalse(RmFieldProgressRules.matches(RmFieldListProgress.DONE, archived, NOW));
    }

    @Test
    void openGapStaysDoneWhateverItsAge() {
        Snapshot pending = new Snapshot(true, NOW.minusDays(90), true);

        assertEquals(Bucket.DONE, RmFieldProgressRules.classify(pending, NOW));
        assertTrue(RmFieldProgressRules.creditOpenGap(FieldControlStatus.ECART, 1_500d, CarnetEcartStatus.PENDING));
        assertTrue(RmFieldProgressRules.creditOpenGap(FieldControlStatus.ECART, 1_500d, null));
        assertFalse(RmFieldProgressRules.creditOpenGap(FieldControlStatus.ECART, 1_500d, CarnetEcartStatus.ACCEPTED));
        assertFalse(RmFieldProgressRules.creditOpenGap(FieldControlStatus.ECART, 1_500d, CarnetEcartStatus.REJECTED));
        assertFalse(RmFieldProgressRules.creditOpenGap(FieldControlStatus.CONFORME, 0d, null));
        assertFalse(RmFieldProgressRules.creditOpenGap(FieldControlStatus.ECART, 0.2d, null));
    }

    @Test
    void tontineOpenGapRequiresAMaterialLineStillPending() {
        assertTrue(RmFieldProgressRules.tontineLineOpen(800d, null));
        assertTrue(RmFieldProgressRules.tontineLineOpen(800d, CarnetEcartStatus.PENDING));
        assertFalse(RmFieldProgressRules.tontineLineOpen(800d, CarnetEcartStatus.REJECTED));
        assertFalse(RmFieldProgressRules.tontineLineOpen(0.2d, null));
        assertTrue(RmFieldProgressRules.tontineOpenGap(FieldControlStatus.ECART, true));
        assertFalse(RmFieldProgressRules.tontineOpenGap(FieldControlStatus.ECART, false));
        assertFalse(RmFieldProgressRules.tontineOpenGap(FieldControlStatus.CONFORME, true));
    }

    @Test
    void progressParameterAcceptsTheThreeSegments() {
        assertEquals(RmFieldListProgress.ALL, RmFieldListProgress.from(null));
        assertEquals(RmFieldListProgress.ALL, RmFieldListProgress.from("  "));
        assertEquals(RmFieldListProgress.TODO, RmFieldListProgress.from("todo"));
        assertEquals(RmFieldListProgress.DONE, RmFieldListProgress.from("DONE"));
        assertThrows(ApplicationException.class, () -> RmFieldListProgress.from("later"));
    }

    @Test
    void sqlPredicatesExposeTheSameThreeBuckets() {
        assertTrue(RmFieldListProgressSql.CREDIT_NATIVE.contains(":progress = 'TODO'"));
        assertTrue(RmFieldListProgressSql.CREDIT_NATIVE.contains(":progress = 'DONE'"));
        assertTrue(RmFieldListProgressSql.CREDIT_NATIVE.contains("ABS(latest.difference_amount) > 0.5"));
        assertTrue(RmFieldListProgressSql.TONTINE_JPQL.contains(":progress = 'TODO'"));
        assertTrue(RmFieldListProgressSql.TONTINE_JPQL.contains("ABS(line.differenceAmount) > 0.5"));
        assertTrue(RmFieldListProgressSql.TONTINE_JPQL.contains("latest.observedAt >= :since"));
    }
}
