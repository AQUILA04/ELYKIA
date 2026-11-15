package com.optimize.elykia.core.service.commercial;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AssignmentPeriodTest {

    @Test
    void inclusiveEndTouchesTheNextDayWithoutOverlap() {
        LocalDate januaryEnd = LocalDate.of(2024, 1, 31);
        LocalDate februaryStart = LocalDate.of(2024, 2, 1);
        assertFalse(AssignmentPeriod.overlaps(
                LocalDate.of(2024, 1, 1), januaryEnd,
                februaryStart, null));
    }

    @Test
    void sameDayIsAnOverlap() {
        LocalDate day = LocalDate.of(2024, 1, 31);
        assertTrue(AssignmentPeriod.overlaps(
                LocalDate.of(2024, 1, 1), day,
                day, LocalDate.of(2024, 3, 1)));
    }

    @Test
    void openPeriodCoversEveryLaterDate() {
        assertTrue(AssignmentPeriod.overlaps(
                LocalDate.of(2024, 1, 1), null,
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30)));
    }

    @Test
    void closedHistoryBeforeAnOpenPeriodDoesNotOverlap() {
        assertFalse(AssignmentPeriod.overlaps(
                LocalDate.of(2020, 1, 1), LocalDate.of(2020, 12, 31),
                LocalDate.of(2021, 1, 1), null));
    }
}
