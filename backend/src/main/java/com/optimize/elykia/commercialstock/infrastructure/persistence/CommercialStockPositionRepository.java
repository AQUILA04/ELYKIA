package com.optimize.elykia.commercialstock.infrastructure.persistence;

import com.optimize.elykia.commercialstock.api.StockActivityType;
import com.optimize.elykia.commercialstock.domain.CommercialStockPosition;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CommercialStockPositionRepository extends JpaRepository<CommercialStockPosition, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from CommercialStockPosition p where p.collector = :collector "
            + "and p.articleId = :articleId and p.activityType = :activityType")
    Optional<CommercialStockPosition> findForUpdate(@Param("collector") String collector,
                                                    @Param("articleId") Long articleId,
                                                    @Param("activityType") StockActivityType activityType);

    Optional<CommercialStockPosition> findByCollectorAndArticleIdAndActivityType(
            String collector, Long articleId, StockActivityType activityType);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from CommercialStockPosition p where p.id = :id")
    Optional<CommercialStockPosition> findByIdForUpdate(@Param("id") Long id);

    @Query("select p from CommercialStockPosition p where (:collector is null or p.collector = :collector) "
            + "and (:activityType is null or p.activityType = :activityType) "
            + "and (:onlyPositive = false or p.quantityOnHand > 0) order by p.collector, p.articleId")
    List<CommercialStockPosition> search(@Param("collector") String collector,
                                         @Param("activityType") StockActivityType activityType,
                                         @Param("onlyPositive") boolean onlyPositive);

    @Query("select p from CommercialStockPosition p where p.articleId = :articleId "
            + "and (:activityType is null or p.activityType = :activityType) "
            + "and (:collector is null or p.collector = :collector)")
    List<CommercialStockPosition> findByArticle(@Param("articleId") Long articleId,
                                                @Param("activityType") StockActivityType activityType,
                                                @Param("collector") String collector);
}
