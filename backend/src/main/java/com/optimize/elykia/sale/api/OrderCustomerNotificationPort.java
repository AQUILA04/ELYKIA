package com.optimize.elykia.sale.api;

import com.optimize.elykia.sale.domain.Order;
import com.optimize.elykia.sale.domain.OrderStatus;

/**
 * SPI port decoupling {@code sale} from customer-space order status notifications.
 */
public interface OrderCustomerNotificationPort {

    void notifyOrderStatusChanged(Order order, OrderStatus newStatus);
}
