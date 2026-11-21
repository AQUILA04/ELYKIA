package com.optimize.elykia.sale.application;

import com.optimize.elykia.sale.domain.Order;
import com.optimize.elykia.sale.domain.OrderStatusHistory;
import com.optimize.elykia.sale.domain.OrderStatus;
import com.optimize.elykia.sale.infrastructure.persistence.OrderStatusHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderStatusHistoryServiceTest {

    @Mock
    private OrderStatusHistoryRepository historyRepository;

    @Test
    void createHistory_persistsTheCompleteStatusTransitionWithItsAuthorAndTimestamp() {
        // Given
        OrderStatusHistoryService service = new OrderStatusHistoryService(historyRepository);
        Order order = new Order();
        order.setId(31L);
        when(historyRepository.save(org.mockito.ArgumentMatchers.any(OrderStatusHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        ArgumentCaptor<OrderStatusHistory> historyCaptor = ArgumentCaptor.forClass(OrderStatusHistory.class);
        LocalDateTime before = LocalDateTime.now();

        // When
        service.createHistory(order, OrderStatus.PENDING, OrderStatus.ACCEPTED, "gestionnaire.a");

        // Then
        LocalDateTime after = LocalDateTime.now();
        verify(historyRepository).save(historyCaptor.capture());
        OrderStatusHistory history = historyCaptor.getValue();
        assertEquals(order, history.getOrder());
        assertEquals(OrderStatus.PENDING, history.getOldStatus());
        assertEquals(OrderStatus.ACCEPTED, history.getNewStatus());
        assertEquals("gestionnaire.a", history.getChangedBy());
        assertNotNull(history.getChangeTimestamp());
        assertTrue(!history.getChangeTimestamp().isBefore(before));
        assertTrue(!history.getChangeTimestamp().isAfter(after));
    }
}
