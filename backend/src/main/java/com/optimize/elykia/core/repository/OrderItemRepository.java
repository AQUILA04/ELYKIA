package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.dto.ArticleOrderSummaryDto;
import com.optimize.elykia.core.dto.RestockNeededDto;
import com.optimize.elykia.core.entity.sale.OrderItem;
import com.optimize.elykia.core.enumaration.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemRepository extends GenericRepository<OrderItem, Long> {

    @Query("SELECT new com.optimize.elykia.core.dto.ArticleOrderSummaryDto(oi.article, SUM(oi.quantity)) " +
           "FROM OrderItem oi WHERE oi.order.status = :status GROUP BY oi.article")
    Page<ArticleOrderSummaryDto> findAggregatedByArticleAndStatus(@Param("status") OrderStatus status, Pageable pageable);

    @Query("SELECT new com.optimize.elykia.core.dto.ArticleOrderSummaryDto(oi.article, SUM(oi.quantity)) " +
           "FROM OrderItem oi WHERE oi.order.status = :status GROUP BY oi.article")
    List<ArticleOrderSummaryDto> findAggregatedByArticleAndStatus(@Param("status") OrderStatus status);

    @Query("SELECT new com.optimize.elykia.core.dto.ArticleOrderSummaryDto(oi.article, SUM(oi.quantity)) " +
           "FROM OrderItem oi WHERE oi.order.status = :status AND oi.order.client.collector = :commercialUsername GROUP BY oi.article")
    Page<ArticleOrderSummaryDto> findAggregatedByArticleAndStatusAndCommercial(@Param("status") OrderStatus status,
                                                                             @Param("commercialUsername") String commercialUsername,
                                                                             Pageable pageable);

    @Query("""
        SELECT new com.optimize.elykia.core.dto.RestockNeededDto(
            oi.article,
            SUM(oi.quantity),
            oi.article.stockQuantity,
            (SUM(oi.quantity) - oi.article.stockQuantity)
        )
        FROM OrderItem oi
        WHERE oi.order.status = com.optimize.elykia.core.enumaration.OrderStatus.ACCEPTED
        GROUP BY oi.article, oi.article.stockQuantity
        HAVING SUM(oi.quantity) > oi.article.stockQuantity
    """)
    List<RestockNeededDto> findRestockNeeded();
}