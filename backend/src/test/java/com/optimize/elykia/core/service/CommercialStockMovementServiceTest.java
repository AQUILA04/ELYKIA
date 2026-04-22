package com.optimize.elykia.core.service;

import com.optimize.elykia.core.entity.stock.CommercialStockMovement;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.repository.CommercialStockMovementRepository;
import com.optimize.elykia.core.service.stock.CommercialStockMovementService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommercialStockMovementServiceTest {

    @Mock
    private CommercialStockMovementRepository repository;

    @InjectMocks
    private CommercialStockMovementService service;

    @Test
    void testRecord_CREDIT_SALE() {
        when(repository.save(any(CommercialStockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CommercialStockMovement movement = service.record(
                1L,
                10L,
                "CR-001",
                CommercialStockMovementType.CREDIT_SALE,
                10,
                3,
                7,
                null,
                "collector1",
                100L,
                "iPhone 13"
        );

        assertNotNull(movement);
        assertEquals(CommercialStockMovementType.CREDIT_SALE, movement.getMovementType());
        assertEquals(10, movement.getQuantityBefore());
        assertEquals(3, movement.getQuantityMoved());
        assertEquals(7, movement.getQuantityAfter());
        assertEquals(10L, movement.getCreditId());
        assertEquals("CR-001", movement.getCreditReference());
        assertEquals("collector1", movement.getCollector());
        assertNull(movement.getStockReturnId());
        assertNotNull(movement.getOperationDate());

        verify(repository).save(any(CommercialStockMovement.class));
    }

    @Test
    void testRecord_CASH_SALE() {
        when(repository.save(any(CommercialStockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CommercialStockMovement movement = service.record(
                1L,
                20L,
                "CASH-001",
                CommercialStockMovementType.CASH_SALE,
                20,
                5,
                15,
                null,
                "collector2",
                101L,
                "Samsung Galaxy"
        );

        assertNotNull(movement);
        assertEquals(CommercialStockMovementType.CASH_SALE, movement.getMovementType());
        assertEquals(20, movement.getQuantityBefore());
        assertEquals(5, movement.getQuantityMoved());
        assertEquals(15, movement.getQuantityAfter());
        assertEquals(20L, movement.getCreditId());

        verify(repository).save(any(CommercialStockMovement.class));
    }

    @Test
    void testRecord_STOCK_IN() {
        when(repository.save(any(CommercialStockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CommercialStockMovement movement = service.record(
                1L,
                null,
                null,
                CommercialStockMovementType.STOCK_IN,
                0,
                10,
                10,
                50L,
                "collector1",
                102L,
                "Xiaomi"
        );

        assertNotNull(movement);
        assertEquals(CommercialStockMovementType.STOCK_IN, movement.getMovementType());
        assertEquals(0, movement.getQuantityBefore());
        assertEquals(10, movement.getQuantityMoved());
        assertEquals(10, movement.getQuantityAfter());
        assertNull(movement.getCreditId());
        assertNull(movement.getCreditReference());
        assertEquals(50L, movement.getStockReturnId());

        verify(repository).save(any(CommercialStockMovement.class));
    }

    @Test
    void testRecord_RETURN() {
        when(repository.save(any(CommercialStockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CommercialStockMovement movement = service.record(
                1L,
                null,
                null,
                CommercialStockMovementType.RETURN,
                10,
                3,
                7,
                60L,
                "collector1",
                103L,
                "OPPO"
        );

        assertNotNull(movement);
        assertEquals(CommercialStockMovementType.RETURN, movement.getMovementType());
        assertEquals(10, movement.getQuantityBefore());
        assertEquals(3, movement.getQuantityMoved());
        assertEquals(7, movement.getQuantityAfter());
        assertEquals(60L, movement.getStockReturnId());

        verify(repository).save(any(CommercialStockMovement.class));
    }

    @Test
    void testProperty_P1_QuantityConservation() {
        when(repository.save(any(CommercialStockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        int quantityBefore = 10;
        int quantityMoved = 3;
        int quantityAfter = quantityBefore - quantityMoved;

        CommercialStockMovement movement = service.record(
                1L,
                1L,
                "TEST-REF",
                CommercialStockMovementType.CREDIT_SALE,
                quantityBefore,
                quantityMoved,
                quantityAfter,
                null,
                "collector1",
                1L,
                "Test Article"
        );

        assertEquals(quantityAfter, movement.getQuantityBefore() - movement.getQuantityMoved());
    }

    @Test
    void testProperty_P3_NonNegativity() {
        when(repository.save(any(CommercialStockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        for (int i = 0; i < 5; i++) {
            int quantityBefore = 10 - i;
            int quantityMoved = 2;

            CommercialStockMovement movement = service.record(
                    1L,
                    1L,
                    "TEST-REF",
                    CommercialStockMovementType.CREDIT_SALE,
                    quantityBefore,
                    quantityMoved,
                    quantityBefore - quantityMoved,
                    null,
                    "collector1",
                    1L,
                    "Test Article"
            );

            assertTrue(movement.getQuantityAfter() >= 0,
                    "quantityAfter should not be negative");
        }
    }

    @Test
    void testGetByStockItem() {
        List<CommercialStockMovement> movements = Arrays.asList(
                createMovement(CommercialStockMovementType.CREDIT_SALE),
                createMovement(CommercialStockMovementType.CASH_SALE)
        );
        when(repository.findByStockItem_IdOrderByOperationDateDesc(1L))
                .thenReturn(movements);

        List<CommercialStockMovement> result = service.getByStockItem(1L);

        assertNotNull(result);
        assertEquals(2, result.size());
        verify(repository).findByStockItem_IdOrderByOperationDateDesc(1L);
    }

    @Test
    void testGetByCredit() {
        List<CommercialStockMovement> movements = Arrays.asList(
                createMovement(CommercialStockMovementType.CREDIT_SALE)
        );
        when(repository.findByCreditIdOrderByOperationDateDesc(1L))
                .thenReturn(movements);

        List<CommercialStockMovement> result = service.getByCredit(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(repository).findByCreditIdOrderByOperationDateDesc(1L);
    }

    @Test
    void testGetByCollectorAndType() {
        List<CommercialStockMovement> movements = Arrays.asList(
                createMovement(CommercialStockMovementType.CREDIT_SALE)
        );
        when(repository.findByCollectorAndMovementTypeOrderByOperationDateDesc("collector1", CommercialStockMovementType.CREDIT_SALE))
                .thenReturn(movements);

        List<CommercialStockMovement> result = service.getByCollectorAndType("collector1", CommercialStockMovementType.CREDIT_SALE);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(repository).findByCollectorAndMovementTypeOrderByOperationDateDesc("collector1", CommercialStockMovementType.CREDIT_SALE);
    }

    @Test
    void testRecord_HandlesException() {
        when(repository.save(any(CommercialStockMovement.class)))
                .thenThrow(new RuntimeException("Database error"));

        CommercialStockMovement movement = service.record(
                1L,
                1L,
                "TEST-REF",
                CommercialStockMovementType.CREDIT_SALE,
                10,
                3,
                7,
                null,
                "collector1",
                1L,
                "Test Article"
        );

        assertNull(movement);
        verify(repository).save(any(CommercialStockMovement.class));
    }

    private CommercialStockMovement createMovement(CommercialStockMovementType type) {
        CommercialStockMovement movement = new CommercialStockMovement();
        movement.setId(1L);
        movement.setCreditId(1L);
        movement.setCreditReference("CR-001");
        movement.setCollector("collector1");
        movement.setMovementType(type);
        movement.setQuantityBefore(10);
        movement.setQuantityMoved(3);
        movement.setQuantityAfter(7);
        movement.setOperationDate(java.time.LocalDateTime.now());
        return movement;
    }
}
