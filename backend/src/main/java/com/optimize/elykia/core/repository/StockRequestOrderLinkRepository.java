package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.stock.StockRequestOrderLink;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface StockRequestOrderLinkRepository extends GenericRepository<StockRequestOrderLink, Long> {

    @Query("""
            SELECT l FROM StockRequestOrderLink l
            JOIN FETCH l.stockRequest sr
            JOIN FETCH l.order o
            WHERE l.stockRequest.id = :stockRequestId
              AND l.state <> 'DELETED'
            """)
    List<StockRequestOrderLink> findByStockRequestId(@Param("stockRequestId") Long stockRequestId);

    @Query("""
            SELECT l FROM StockRequestOrderLink l
            JOIN FETCH l.stockRequest sr
            WHERE l.order.id IN :orderIds
              AND l.state <> 'DELETED'
              AND sr.status IN :activeStatuses
            """)
    List<StockRequestOrderLink> findActiveByOrderIds(
            @Param("orderIds") Collection<Long> orderIds,
            @Param("activeStatuses") Collection<StockRequestStatus> activeStatuses);

    @Query("""
            SELECT l FROM StockRequestOrderLink l
            JOIN FETCH l.order o
            WHERE l.stockRequest.id IN :stockRequestIds
              AND l.state <> 'DELETED'
            """)
    List<StockRequestOrderLink> findByStockRequestIds(
            @Param("stockRequestIds") Collection<Long> stockRequestIds);

    @Query("""
            SELECT CASE WHEN COUNT(l) > 0 THEN true ELSE false END
            FROM StockRequestOrderLink l
            JOIN l.stockRequest sr
            WHERE l.order.id = :orderId
              AND l.state <> 'DELETED'
              AND sr.status IN :activeStatuses
            """)
    boolean existsActiveForOrder(
            @Param("orderId") Long orderId,
            @Param("activeStatuses") Collection<StockRequestStatus> activeStatuses);
}
