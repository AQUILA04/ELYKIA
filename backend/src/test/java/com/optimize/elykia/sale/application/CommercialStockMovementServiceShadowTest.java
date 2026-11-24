package com.optimize.elykia.sale.application;

import com.optimize.elykia.commercialstock.api.CommercialStockReferenceType;
import com.optimize.elykia.commercialstock.api.LegacyStockMovementEvent;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import com.optimize.elykia.sale.domain.CommercialMonthlyStockItem;
import com.optimize.elykia.sale.domain.CommercialStockMovement;
import com.optimize.elykia.sale.domain.CommercialStockMovementType;
import com.optimize.elykia.sale.infrastructure.persistence.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CommercialStockMovementRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CommercialStockMovementServiceShadowTest {

    private final CommercialStockMovementRepository repository = mock(CommercialStockMovementRepository.class);
    private final CommercialMonthlyStockItemRepository itemRepository = mock(CommercialMonthlyStockItemRepository.class);
    private final ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);

    private CommercialStockMovementService service() {
        CommercialStockMovementService service = new CommercialStockMovementService(repository, itemRepository);
        service.setEventPublisher(publisher);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(new CommercialMonthlyStockItem()));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        return service;
    }

    private void record(CommercialStockMovementService service, CommercialStockMovementType type) {
        service.record(1L, 55L, "CRD-1", type, 5, 2, 3, 77L, "com.a", 7L, "Art", 4000.0, 5000.0, 2000.0,
                "SRC", 88L);
    }

    @Test
    void creditSale_publishesSaleEventReferencingTheCredit() {
        record(service(), CommercialStockMovementType.CREDIT_SALE);

        ArgumentCaptor<LegacyStockMovementEvent> captor = ArgumentCaptor.forClass(LegacyStockMovementEvent.class);
        verify(publisher).publishEvent(captor.capture());
        LegacyStockMovementEvent event = captor.getValue();
        assertEquals(LegacyStockMovementEvent.Kind.SALE, event.kind());
        assertEquals(StockActivityType.CREDIT, event.activityType());
        assertEquals(CommercialStockReferenceType.CREDIT, event.referenceType());
        assertEquals(55L, event.referenceId());
        assertEquals(2, event.quantity());
    }

    @Test
    void stockIn_publishesEventWithSourceRequestAndCost() {
        record(service(), CommercialStockMovementType.STOCK_IN);

        ArgumentCaptor<LegacyStockMovementEvent> captor = ArgumentCaptor.forClass(LegacyStockMovementEvent.class);
        verify(publisher).publishEvent(captor.capture());
        assertEquals(LegacyStockMovementEvent.Kind.STOCK_IN, captor.getValue().kind());
        assertEquals(88L, captor.getValue().referenceId());
        assertEquals(4000.0, captor.getValue().unitPurchaseCost());
    }

    @Test
    void cashSaleAndAdjustment_doNotFeedTheContinuousLedger() {
        CommercialStockMovementService service = service();
        record(service, CommercialStockMovementType.CASH_SALE);
        record(service, CommercialStockMovementType.ADJUSTMENT);

        verify(publisher, never()).publishEvent(any(Object.class));
    }
}
