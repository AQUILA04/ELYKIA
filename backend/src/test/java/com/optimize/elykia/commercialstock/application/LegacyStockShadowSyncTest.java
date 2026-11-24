package com.optimize.elykia.commercialstock.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.commercialstock.api.CommercialStockFacade;
import com.optimize.elykia.commercialstock.api.CommercialStockMovementType;
import com.optimize.elykia.commercialstock.api.CommercialStockReferenceType;
import com.optimize.elykia.commercialstock.api.ConsumeStockCommand;
import com.optimize.elykia.commercialstock.api.LegacyStockMovementEvent;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import com.optimize.elykia.commercialstock.api.StockInCommand;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class LegacyStockShadowSyncTest {

    private CommercialStockFacade facade;
    private LegacyStockShadowSync sync;

    @BeforeEach
    void setUp() {
        facade = mock(CommercialStockFacade.class);
        sync = new LegacyStockShadowSync(facade, true);
    }

    private LegacyStockMovementEvent event(LegacyStockMovementEvent.Kind kind, StockActivityType activity) {
        return new LegacyStockMovementEvent(kind, activity, "com.a", 7L, 3, 4000.0, 5000.0,
                CommercialStockReferenceType.CREDIT, 55L, "CRD-1", null, LocalDate.of(2026, 11, 22), null);
    }

    @Test
    void stockIn_isMirroredWithCostAndPrice() {
        sync.onLegacyMovement(event(LegacyStockMovementEvent.Kind.STOCK_IN, StockActivityType.CREDIT));

        ArgumentCaptor<StockInCommand> captor = ArgumentCaptor.forClass(StockInCommand.class);
        verify(facade).stockIn(captor.capture());
        assertEquals(4000.0, captor.getValue().unitPurchaseCost());
        assertEquals(3, captor.getValue().quantity());
        assertEquals("legacy-sync", captor.getValue().performedBy());
    }

    @Test
    void sale_usesActivitySpecificMovementType() {
        sync.onLegacyMovement(event(LegacyStockMovementEvent.Kind.SALE, StockActivityType.CREDIT));
        sync.onLegacyMovement(event(LegacyStockMovementEvent.Kind.SALE, StockActivityType.TONTINE));

        ArgumentCaptor<ConsumeStockCommand> captor = ArgumentCaptor.forClass(ConsumeStockCommand.class);
        verify(facade, org.mockito.Mockito.times(2)).consume(captor.capture());
        assertEquals(CommercialStockMovementType.CREDIT_SALE, captor.getAllValues().get(0).movementType());
        assertEquals(CommercialStockMovementType.TONTINE_DELIVERY, captor.getAllValues().get(1).movementType());
    }

    @Test
    void return_consumesWithReturnType() {
        sync.onLegacyMovement(event(LegacyStockMovementEvent.Kind.RETURN, StockActivityType.CREDIT));

        ArgumentCaptor<ConsumeStockCommand> captor = ArgumentCaptor.forClass(ConsumeStockCommand.class);
        verify(facade).consume(captor.capture());
        assertEquals(CommercialStockMovementType.RETURN, captor.getValue().movementType());
    }

    @Test
    void cancellation_restoresByReference() {
        when(facade.restoreByReference(any(), any(), any(), any(), any(), any(), org.mockito.ArgumentMatchers.anyInt(),
                any(), any())).thenReturn(3);

        sync.onLegacyMovement(event(LegacyStockMovementEvent.Kind.SALE_CANCELLATION, StockActivityType.CREDIT));

        verify(facade).restoreByReference("com.a", 7L, StockActivityType.CREDIT, CommercialStockReferenceType.CREDIT, 55L,
                CommercialStockMovementType.SALE_CANCELLATION, 3, LocalDate.of(2026, 11, 22), "legacy-sync");
    }

    @Test
    void driftInNewModel_neverPropagatesToTheBusinessFlow() {
        when(facade.consume(any())).thenThrow(new CustomValidationException("Stock insuffisant"));

        assertDoesNotThrow(() -> sync.onLegacyMovement(event(LegacyStockMovementEvent.Kind.SALE, StockActivityType.CREDIT)));
    }

    @Test
    void disabledFlag_ignoresEvents() {
        new LegacyStockShadowSync(facade, false)
                .onLegacyMovement(event(LegacyStockMovementEvent.Kind.SALE, StockActivityType.CREDIT));

        verifyNoInteractions(facade);
    }

    @Test
    void invalidEvents_areIgnored() {
        sync.onLegacyMovement(new LegacyStockMovementEvent(LegacyStockMovementEvent.Kind.SALE, StockActivityType.CREDIT,
                "com.a", 7L, 0, null, null, null, null, null, null, null, null));
        verify(facade, never()).consume(any());
    }
}
