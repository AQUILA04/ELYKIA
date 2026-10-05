package com.optimize.elykia.core.service.order;

import com.optimize.elykia.core.dto.UpdateOrderStatusDto;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.entity.stock.StockRequestOrderLink;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.event.StockRequestValidatedEvent;
import com.optimize.elykia.core.repository.StockRequestOrderLinkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderStockRequestListener {

    private final StockRequestOrderLinkRepository linkRepository;
    private final OrderService orderService;

    @EventListener
    public void onStockRequestValidated(StockRequestValidatedEvent event) {
        if (event == null || event.getStockRequestId() == null) {
            return;
        }
        List<StockRequestOrderLink> links = linkRepository.findByStockRequestId(event.getStockRequestId());
        if (links.isEmpty()) {
            return;
        }
        List<Long> pendingOrderIds = links.stream()
                .map(StockRequestOrderLink::getOrder)
                .filter(order -> order != null && order.getStatus() == OrderStatus.PENDING)
                .map(Order::getId)
                .distinct()
                .toList();
        if (pendingOrderIds.isEmpty()) {
            log.debug("Aucune commande PENDING liée à la demande {}", event.getStockRequestId());
            return;
        }
        UpdateOrderStatusDto dto = new UpdateOrderStatusDto();
        dto.setOrderIds(pendingOrderIds);
        dto.setNewStatus(OrderStatus.ACCEPTED);
        orderService.updateOrderStatus(dto);
        log.info("Commandes {} passées en ACCEPTED suite à la validation de la demande {}",
                pendingOrderIds, event.getStockRequestId());
    }
}
