package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.stock.StockTontineRequestDeliveryLink;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface StockTontineRequestDeliveryLinkRepository
        extends GenericRepository<StockTontineRequestDeliveryLink, Long> {

    @Query("""
            SELECT l FROM StockTontineRequestDeliveryLink l
            JOIN FETCH l.stockTontineRequest sr
            JOIN FETCH l.delivery d
            JOIN FETCH d.tontineMember
            WHERE l.stockTontineRequest.id = :stockRequestId
              AND l.state <> 'DELETED'
            """)
    List<StockTontineRequestDeliveryLink> findByStockRequestId(@Param("stockRequestId") Long stockRequestId);

    @Query("""
            SELECT l FROM StockTontineRequestDeliveryLink l
            JOIN FETCH l.delivery d
            WHERE l.stockTontineRequest.id IN :stockRequestIds
              AND l.state <> 'DELETED'
            """)
    List<StockTontineRequestDeliveryLink> findByStockRequestIds(
            @Param("stockRequestIds") Collection<Long> stockRequestIds);

    @Query("""
            SELECT CASE WHEN COUNT(l) > 0 THEN true ELSE false END
            FROM StockTontineRequestDeliveryLink l
            JOIN l.stockTontineRequest sr
            WHERE l.delivery.id = :deliveryId
              AND l.state <> 'DELETED'
              AND sr.status IN :activeStatuses
            """)
    boolean existsActiveForDelivery(
            @Param("deliveryId") Long deliveryId,
            @Param("activeStatuses") Collection<StockRequestStatus> activeStatuses);
}
