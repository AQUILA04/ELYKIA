package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.sale.OrderStatusHistory;

import com.optimize.elykia.core.enumaration.OrderStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface OrderStatusHistoryRepository extends GenericRepository<OrderStatusHistory, Long> {

    long countByNewStatusAndChangeTimestampBetween(OrderStatus newStatus, LocalDateTime start, LocalDateTime end);

    @Query("SELECT COALESCE(SUM(h.order.totalAmount), 0) FROM OrderStatusHistory h WHERE h.newStatus = :status AND h.changeTimestamp BETWEEN :start AND :end")
    double sumTotalAmountForNewStatusBetween(@Param("status") OrderStatus status, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

}
