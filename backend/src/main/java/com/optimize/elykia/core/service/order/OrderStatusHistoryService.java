package com.optimize.elykia.core.service.order;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.entity.Order;
import com.optimize.elykia.core.entity.OrderStatusHistory;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.repository.OrderStatusHistoryRepository;
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
