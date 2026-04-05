package com.optimize.elykia.core.service;

import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.entity.stock.CommercialStockMovement;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.repository.CommercialStockMovementRepository;
import com.optimize.elykia.core.service.stock.CommercialStockMovementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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

    private CommercialMonthlyStockItem stockItem;
    private CommercialMonthlyStock monthlyStock;
    private Credit credit;
    private Articles article;

    @BeforeEach
    void setUp() {
        article = new Articles();
        article.setId(1L);
        article.setName("iPhone 13");

        monthlyStock = new CommercialMonthlyStock();
        monthlyStock.setId(1L);
        monthlyStock.setCollector("collector1");

        stockItem = new CommercialMonthlyStockItem();
        stockItem.setId(1L);
        stockItem.setArticle(article);
        stockItem.setMonthlyStock(monthlyStock);
        stockItem.setQuantityRemaining(10);

        credit = new Credit();
        credit.setId(1L);
        credit.setReference("CR-001");
    }

    @Test
    void testRecord_CREDIT_SALE() {
        when(repository.save(any(CommercialStockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CommercialStockMovement movement = service.record(
                stockItem,
                credit,
                CommercialStockMovementType.CREDIT_SALE,
                10,
                3,
                7
        );

        assertNotNull(movement);
        assertEquals(CommercialStockMovementType.CREDIT_SALE, movement.getMovementType());
        assertEquals(10, movement.getQuantityBefore());
        assertEquals(3, movement.getQuantityMoved());
        assertEquals(7, movement.getQuantityAfter());
        assertEquals(stockItem, movement.getStockItem());
        assertEquals(credit, movement.getCredit());
        assertEquals("CR-001", movement.getCreditReference());
        assertEquals("collector1", movement.getCollector());
        assertEquals(article, movement.getArticle());
        assertNotNull(movement.getOperationDate());

        verify(repository).save(any(CommercialStockMovement.class));
    }

    @Test
    void testRecord_CASH_SALE() {
        when(repository.save(any(CommercialStockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CommercialStockMovement movement = service.record(
                stockItem,
                credit,
                CommercialStockMovementType.CASH_SALE,
                20,
                5,
                15
        );

        assertNotNull(movement);
        assertEquals(CommercialStockMovementType.CASH_SALE, movement.getMovementType());
        assertEquals(20, movement.getQuantityBefore());
        assertEquals(5, movement.getQuantityMoved());
        assertEquals(15, movement.getQuantityAfter());

        verify(repository).save(any(CommercialStockMovement.class));
    }

    @Test
    void testRecord_WithNullCredit() {
        when(repository.save(any(CommercialStockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CommercialStockMovement movement = service.record(
                stockItem,
                null,
                CommercialStockMovementType.STOCK_IN,
                10,
                10,
                20
        );

        assertNotNull(movement);
        assertEquals(CommercialStockMovementType.STOCK_IN, movement.getMovementType());
        assertNull(movement.getCredit());
        assertNull(movement.getCreditReference());

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
                stockItem,
                credit,
                CommercialStockMovementType.CREDIT_SALE,
                quantityBefore,
                quantityMoved,
                quantityAfter
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
                    stockItem,
                    credit,
                    CommercialStockMovementType.CREDIT_SALE,
                    quantityBefore,
                    quantityMoved,
                    quantityBefore - quantityMoved
            );

            assertTrue(movement.getQuantityAfter() >= 0,
                    "quantityAfter should not be negative");
        }
    }

    @Test
    void testProperty_P4_CreditReferenceConsistency() {
        when(repository.save(any(CommercialStockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        credit.setReference("TEST-REF-123");

        CommercialStockMovement movement = service.record(
                stockItem,
                credit,
                CommercialStockMovementType.CREDIT_SALE,
                10,
                3,
                7
        );

        assertEquals(credit.getReference(), movement.getCreditReference());
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
        when(repository.findByCredit_IdOrderByOperationDateDesc(1L))
                .thenReturn(movements);

        List<CommercialStockMovement> result = service.getByCredit(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(repository).findByCredit_IdOrderByOperationDateDesc(1L);
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
                stockItem,
                credit,
                CommercialStockMovementType.CREDIT_SALE,
                10,
                3,
                7
        );

        assertNull(movement);
        verify(repository).save(any(CommercialStockMovement.class));
    }

    private CommercialStockMovement createMovement(CommercialStockMovementType type) {
        CommercialStockMovement movement = new CommercialStockMovement();
        movement.setId(1L);
        movement.setStockItem(stockItem);
        movement.setCredit(credit);
        movement.setArticle(article);
        movement.setCollector("collector1");
        movement.setMovementType(type);
        movement.setQuantityBefore(10);
        movement.setQuantityMoved(3);
        movement.setQuantityAfter(7);
        movement.setOperationDate(java.time.LocalDateTime.now());
        return movement;
    }
}
