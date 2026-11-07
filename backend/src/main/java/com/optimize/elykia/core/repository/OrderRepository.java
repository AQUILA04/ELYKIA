package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.enumaration.OrderSource;
import com.optimize.elykia.core.enumaration.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;

public interface OrderRepository extends GenericRepository<Order, Long> {

    // Note : Les requêtes sont maintenant adaptées à votre logique de "soft delete"
    // qui utilise un champ "state" et non "deleted".
    // Je suppose que l'enum State est stocké en tant que String ('DELETED').

    @Query("SELECT o FROM Order o WHERE o.client.collector = :collectorUsername AND o.state <> 'DELETED'")
    Page<Order> findByClient_Collector(@Param("collectorUsername") String collectorUsername, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.client.id = :clientId AND o.state <> 'DELETED'")
    Page<Order> findByClient_Id(@Param("clientId") Long clientId, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.status = :status AND o.state <> 'DELETED'")
    Page<Order> findByStatus(@Param("status") OrderStatus status, Pageable pageable);

    @Query("""
            SELECT o FROM Order o
            WHERE o.status = :status
              AND o.source = :source
              AND o.state <> 'DELETED'
            """)
    Page<Order> findByStatusAndSource(
            @Param("status") OrderStatus status,
            @Param("source") OrderSource source,
            Pageable pageable);

    @Query("""
            SELECT o FROM Order o
            WHERE o.status = :status
              AND o.state <> 'DELETED'
              AND UPPER(o.client.collector) = UPPER(:username)
            """)
    Page<Order> findByStatusAndClientCollector(
            @Param("status") OrderStatus status,
            @Param("username") String username,
            Pageable pageable);

    @Query("""
            SELECT o FROM Order o
            WHERE o.status = :status
              AND o.source = :source
              AND o.state <> 'DELETED'
              AND UPPER(o.client.collector) = UPPER(:username)
            """)
    Page<Order> findByStatusAndSourceAndClientCollector(
            @Param("status") OrderStatus status,
            @Param("source") OrderSource source,
            @Param("username") String username,
            Pageable pageable);

    @Query("""
            SELECT o FROM Order o
            WHERE o.state <> 'DELETED'
              AND o.status IN :statuses
              AND (:source IS NULL OR o.source = :source)
              AND (:collector IS NULL OR UPPER(o.client.collector) = UPPER(:collector))
              AND (
                    COALESCE(:search, '') = ''
                    OR CAST(o.id AS string) LIKE CONCAT('%', :search, '%')
                    OR LOWER(COALESCE(o.client.firstname, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(o.client.lastname, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(o.client.code, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(o.client.phone, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            """)
    Page<Order> searchOrders(
            @Param("statuses") Collection<OrderStatus> statuses,
            @Param("source") OrderSource source,
            @Param("collector") String collector,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status AND o.state <> 'DELETED'")
    long countByStatus(@Param("status") OrderStatus status);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status AND o.source = :source AND o.state <> 'DELETED'")
    long countByStatusAndSource(@Param("status") OrderStatus status, @Param("source") OrderSource source);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status = :status AND o.state <> 'DELETED'")
    double sumTotalAmountByStatus(@Param("status") OrderStatus status);

    @Query("""
            SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o
            WHERE o.status = :status AND o.source = :source AND o.state <> 'DELETED'
            """)
    double sumTotalAmountByStatusAndSource(
            @Param("status") OrderStatus status, @Param("source") OrderSource source);

    @Query("SELECT COALESCE(SUM(o.totalPurchasePrice), 0) FROM Order o WHERE o.status = :status AND o.state <> 'DELETED'")
    double sumTotalPurchasePriceByStatus(@Param("status") OrderStatus status);

    @Query("""
            SELECT COALESCE(SUM(o.totalPurchasePrice), 0) FROM Order o
            WHERE o.status = :status AND o.source = :source AND o.state <> 'DELETED'
            """)
    double sumTotalPurchasePriceByStatusAndSource(
            @Param("status") OrderStatus status, @Param("source") OrderSource source);

}

