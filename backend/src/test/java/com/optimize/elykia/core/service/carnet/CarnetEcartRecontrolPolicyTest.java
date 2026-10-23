package com.optimize.elykia.core.service.carnet;

import com.optimize.elykia.core.entity.carnet.CarnetEcartDecision;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControlLine;
import com.optimize.elykia.core.enumaration.CarnetEcartStatus;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.service.carnet.CarnetEcartRecontrolPolicy.EcartDecisionView;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CarnetEcartRecontrolPolicyTest {

    @Test
    void summarizeCredit_pendingMaterialEcartIsModifiable() {
        EcartDecisionView view = CarnetEcartRecontrolPolicy.summarizeCredit(
                FieldControlStatus.ECART, 1_500d, null);

        assertEquals(CarnetEcartStatus.PENDING, view.status());
        assertTrue(view.modifiable());
    }

    @Test
    void summarizeCredit_acceptedOrConformeStartsANewControl() {
        CarnetEcartDecision accepted = new CarnetEcartDecision();
        accepted.setStatus(CarnetEcartStatus.ACCEPTED);

        EcartDecisionView acceptedView = CarnetEcartRecontrolPolicy.summarizeCredit(
                FieldControlStatus.ECART, 1_500d, accepted);
        EcartDecisionView conforme = CarnetEcartRecontrolPolicy.summarizeCredit(
                FieldControlStatus.CONFORME, 0d, null);

        assertEquals(CarnetEcartStatus.ACCEPTED, acceptedView.status());
        assertFalse(acceptedView.modifiable());
        assertNull(conforme.status());
        assertFalse(conforme.modifiable());
    }

    @Test
    void summarizeTontine_keepsControlModifiableWhileAnyMaterialLineIsPending() {
        TontineMemberFieldControlLine open = line(1L, 2_000d);
        TontineMemberFieldControlLine closed = line(2L, 3_000d);

        EcartDecisionView view = CarnetEcartRecontrolPolicy.summarizeTontine(
                FieldControlStatus.ECART,
                List.of(open, closed),
                Map.of(2L, CarnetEcartStatus.ACCEPTED));

        assertEquals(CarnetEcartStatus.PENDING, view.status());
        assertTrue(view.modifiable());
    }

    @Test
    void summarizeTontine_rejectedLinesAllowANewControl() {
        TontineMemberFieldControlLine closed = line(2L, -3_000d);

        EcartDecisionView view = CarnetEcartRecontrolPolicy.summarizeTontine(
                FieldControlStatus.ECART,
                List.of(closed),
                Map.of(2L, CarnetEcartStatus.REJECTED));

        assertEquals(CarnetEcartStatus.REJECTED, view.status());
        assertFalse(view.modifiable());
    }

    private static TontineMemberFieldControlLine line(Long id, double difference) {
        TontineMemberFieldControlLine line = new TontineMemberFieldControlLine();
        line.setId(id);
        line.setDifferenceAmount(difference);
        return line;
    }
}
