package com.optimize.elykia.core.service.tontine;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TontineCommercialCollectionRestoreJobTest {

    @Test
    void confirmationIsRequiredBeforeAnyRestore() {
        assertThrows(IllegalStateException.class,
                () -> TontineCommercialCollectionRestoreJob.requireConfirmation(null));
        assertThrows(IllegalStateException.class,
                () -> TontineCommercialCollectionRestoreJob.requireConfirmation("COM003"));
        TontineCommercialCollectionRestoreJob.requireConfirmation("RESTORE-COM003-RUN-5");
    }

    @Test
    void applyFlagIsExplicit() {
        assertFalse(TontineCommercialCollectionRestoreJob.shouldApply(null));
        assertFalse(TontineCommercialCollectionRestoreJob.shouldApply("true"));
        assertTrue(TontineCommercialCollectionRestoreJob.shouldApply("APPLY"));
    }
}
