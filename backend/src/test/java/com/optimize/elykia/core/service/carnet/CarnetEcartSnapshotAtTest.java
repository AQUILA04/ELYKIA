package com.optimize.elykia.core.service.carnet;

import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControl;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CarnetEcartSnapshotAtTest {

    @Test
    void snapshotAt_usesLatestOfCreationAndLastModification() {
        LocalDateTime created = LocalDateTime.of(2026, 8, 1, 8, 0);
        TontineMemberFieldControl control = new TontineMemberFieldControl();
        control.setCreatedDate(created);
        control.setLastModifiedDate(null);
        assertEquals(created, CarnetEcartDecisionService.snapshotAt(control));
        control.setLastModifiedDate(created.plusHours(5));
        assertEquals(created.plusHours(5), CarnetEcartDecisionService.snapshotAt(control));
        control.setLastModifiedDate(created.minusHours(1));
        assertEquals(created, CarnetEcartDecisionService.snapshotAt(control));
    }
}
