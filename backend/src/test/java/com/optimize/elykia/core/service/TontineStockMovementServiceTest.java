package com.optimize.elykia.core.service;

import com.optimize.elykia.core.entity.stock.TontineStockMovement;
import com.optimize.elykia.core.enumaration.TontineStockMovementType;
import com.optimize.elykia.core.repository.TontineStockMovementRepository;
import com.optimize.elykia.core.service.stock.TontineStockMovementService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineStockMovementServiceTest {

    @Mock
    private TontineStockMovementRepository repository;

    @InjectMocks
    private TontineStockMovementService service;

    @Test
    void testRecord_TONTINE_DELIVERY() {
        when(repository.save(any(TontineStockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        TontineStockMovement movement = service.record(
                1L,
                10L,
                "T-001",
                null,
                null,
                null,
                99L,
                "Jean Dupont (#99)",
                "collector1",
                100L,
                "iPhone 13",
                TontineStockMovementType.TONTINE_DELIVERY,
                10,
                3,
                7
        );

        assertNotNull(movement);
        assertEquals(TontineStockMovementType.TONTINE_DELIVERY, movement.getMovementType());
        assertEquals(10L, movement.getCreditId());
        assertEquals("T-001", movement.getCreditReference());
        assertEquals(99L, movement.getTontineDeliveryId());
        assertEquals("Jean Dupont (#99)", movement.getTontineDeliveryReference());
        verify(repository).save(any(TontineStockMovement.class));
    }

    @Test
    void testRecord_STOCK_IN() {
        when(repository.save(any(TontineStockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        TontineStockMovement movement = service.record(
                2L,
                null,
                null,
                50L,
                "STR-001",
                null,
                null,
                null,
                "collector2",
                101L,
                "Samsung Galaxy",
                TontineStockMovementType.STOCK_IN,
                0,
                5,
                5
        );

        assertNotNull(movement);
        assertEquals(TontineStockMovementType.STOCK_IN, movement.getMovementType());
        assertEquals(50L, movement.getStockTontineRequestId());
        assertNull(movement.getTontineDeliveryId());
    }

    @Test
    void testRecord_RETURN() {
        when(repository.save(any(TontineStockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        TontineStockMovement movement = service.record(
                3L,
                null,
                null,
                null,
                null,
                20L,
                null,
                null,
                "collector3",
                102L,
                "Tablette",
                TontineStockMovementType.RETURN,
                8,
                2,
                6
        );

        assertNotNull(movement);
        assertEquals(TontineStockMovementType.RETURN, movement.getMovementType());
        assertEquals(20L, movement.getStockTontineReturnId());
    }
}
