package com.optimize.elykia.core.service.order;

import com.optimize.elykia.core.dto.UpdateOrderStatusDto;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.entity.stock.StockRequestOrderLink;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.event.StockRequestValidatedEvent;
import com.optimize.elykia.core.repository.StockRequestOrderLinkRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderStockRequestListenerTest {

    @Mock private StockRequestOrderLinkRepository linkRepository;
    @Mock private OrderService orderService;

    @InjectMocks
    private OrderStockRequestListener listener;

    @Test
    void onValidated_acceptsOnlyPendingLinkedOrders() {
        Order pending = order(1L, OrderStatus.PENDING);
        Order accepted = order(2L, OrderStatus.ACCEPTED);
        when(linkRepository.findByStockRequestId(50L)).thenReturn(List.of(
                link(pending),
                link(accepted)));

        listener.onStockRequestValidated(new StockRequestValidatedEvent(this, 50L));

        ArgumentCaptor<UpdateOrderStatusDto> captor = ArgumentCaptor.forClass(UpdateOrderStatusDto.class);
        verify(orderService).updateOrderStatus(captor.capture());
        assertEquals(List.of(1L), captor.getValue().getOrderIds());
        assertEquals(OrderStatus.ACCEPTED, captor.getValue().getNewStatus());
    }

    @Test
    void onValidated_noopWhenNoPendingOrders() {
        Order accepted = order(2L, OrderStatus.ACCEPTED);
        when(linkRepository.findByStockRequestId(50L)).thenReturn(List.of(link(accepted)));

        listener.onStockRequestValidated(new StockRequestValidatedEvent(this, 50L));

        verify(orderService, never()).updateOrderStatus(org.mockito.ArgumentMatchers.any());
    }

    private Order order(Long id, OrderStatus status) {
        Order order = new Order();
        order.setId(id);
        order.setStatus(status);
        return order;
    }

    private StockRequestOrderLink link(Order order) {
        StockRequestOrderLink link = new StockRequestOrderLink();
        link.setOrder(order);
        return link;
    }
}
