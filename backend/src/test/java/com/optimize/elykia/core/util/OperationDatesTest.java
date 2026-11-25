package com.optimize.elykia.core.util;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OperationDatesTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 20, 10, 0);

    @Test
    void keepsTheTerminalDateWhenItIsInThePast() {
        LocalDateTime requested = NOW.minusHours(3);
        assertEquals(requested, OperationDates.resolve(requested, NOW));
    }

    @Test
    void fallsBackToServerTimeWhenMissingOrInTheFuture() {
        assertEquals(NOW, OperationDates.resolve(null, NOW));
        assertEquals(NOW, OperationDates.resolve(NOW.plusMinutes(5), NOW));
    }
}
