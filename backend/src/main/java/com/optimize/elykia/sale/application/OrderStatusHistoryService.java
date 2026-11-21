package com.optimize.elykia.sale.application;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.sale.domain.Order;
import com.optimize.elykia.sale.domain.OrderStatusHistory;
import com.optimize.elykia.sale.domain.OrderStatus;
import com.optimize.elykia.sale.infrastructure.persistence.OrderStatusHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Transactional
public class OrderStatusHistoryService extends GenericService<OrderStatusHistory, Long> {

    protected OrderStatusHistoryService(OrderStatusHistoryRepository repository) {
        super(repository);
    }

    public void createHistory(Order order, OrderStatus oldStatus, OrderStatus newStatus, String username) {
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrder(order);
        history.setOldStatus(oldStatus);
        history.setNewStatus(newStatus);
        history.setChangeTimestamp(LocalDateTime.now());
        history.setChangedBy(username);
        this.create(history);
    }
}
