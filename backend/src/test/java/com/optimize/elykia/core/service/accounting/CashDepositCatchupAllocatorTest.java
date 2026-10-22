package com.optimize.elykia.core.service.accounting;

import com.optimize.elykia.core.service.accounting.CashDepositCatchupAllocator.Allocation;
import com.optimize.elykia.core.service.accounting.CashDepositCatchupAllocator.CatchupCap;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CashDepositCatchupAllocatorTest {

    private static final LocalDate OLDER = LocalDate.of(2026, 10, 20);
    private static final LocalDate NEWER = LocalDate.of(2026, 10, 21);

    @Test
    void allocate_fillsTodayBeforeOldestCatchupAndLeavesSurplusOnTheCaptureDay() {
        Allocation allocation = CashDepositCatchupAllocator.allocate(
                100.0, 900.0, 50.0, 0.0, 200.0,
                List.of(
                        new CatchupCap(OLDER, 400.0, 400.0, 400.0),
                        new CatchupCap(NEWER, 250.0, 250.0, 250.0)));

        assertEquals(100.0, allocation.credit());
        assertEquals(250.0, allocation.tontineOnCaptureDay());
        assertEquals(50.0, allocation.newBalance());
        assertEquals(0.0, allocation.surplus());
        assertEquals(2, allocation.slices().size());
        assertEquals(OLDER, allocation.slices().get(0).date());
        assertEquals(400.0, allocation.slices().get(0).amount());
        assertEquals(NEWER, allocation.slices().get(1).date());
        assertEquals(250.0, allocation.slices().get(1).amount());
        assertEquals(1_050.0, allocation.physicalAmount());
    }

    @Test
    void allocate_capsCatchupAtOpenRemainingAndReturnsExcessTontineToTheCaptureDay() {
        Allocation allocation = CashDepositCatchupAllocator.allocate(
                0.0, 1_000.0, 0.0, 0.0, 100.0,
                List.of(new CatchupCap(OLDER, 800.0, 300.0, 300.0)));

        assertEquals(700.0, allocation.tontineOnCaptureDay());
        assertEquals(1, allocation.slices().size());
        assertEquals(300.0, allocation.slices().get(0).amount());
    }

    @Test
    void allocate_keepsTheWholeTontineOnTheCaptureDayWhenNoCatchupFits() {
        Allocation allocation = CashDepositCatchupAllocator.allocate(
                600.0, 300.0, 100.0, 0.0, 0.0, List.of());

        assertTrue(allocation.slices().isEmpty());
        assertEquals(300.0, allocation.tontineOnCaptureDay());
        assertEquals(1_000.0, allocation.captureDayAmount());
    }

    @Test
    void allocate_usesTheDayCatchupTotalAndLeavesAnOlderUnpaidRemainder() {
        Allocation allocation = CashDepositCatchupAllocator.allocate(
                0.0, 12_000.0, 0.0, 0.0, 0.0,
                List.of(new CatchupCap(OLDER, 2_000.0, 10_000.0, 10_000.0)));

        assertEquals(1, allocation.slices().size());
        assertEquals(2_000.0, allocation.slices().get(0).amount());
        assertEquals(10_000.0, allocation.tontineOnCaptureDay());
    }

    @Test
    void allocate_doesNotReachCatchupsWhenTontineStaysWithinTheDay() {
        Allocation allocation = CashDepositCatchupAllocator.allocate(
                0.0, 150.0, 0.0, 40.0, 500.0,
                List.of(new CatchupCap(OLDER, 200.0, 200.0, 200.0)));

        assertTrue(allocation.slices().isEmpty());
        assertEquals(150.0, allocation.tontineOnCaptureDay());
        assertEquals(40.0, allocation.surplus());
    }
}
