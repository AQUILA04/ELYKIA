package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.StockMovement;
import com.optimize.elykia.core.enumaration.MovementType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface StockMovementRepository extends GenericRepository<StockMovement, Long> {
    
    List<StockMovement> findByArticleIdOrderByMovementDateDesc(Long articleId);
    
    Page<StockMovement> findByMovementDateBetween(LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);
    
    List<StockMovement> findByTypeAndMovementDateBetween(MovementType type, LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT SUM(s.quantity) FROM StockMovement s WHERE s.article.id = :articleId AND s.type = :type AND s.movementDate BETWEEN :startDate AND :endDate")
    Integer sumQuantityByArticleAndTypeAndDateRange(
        @Param("articleId") Long articleId, 
        @Param("type") MovementType type,
        @Param("startDate") LocalDateTime startDate, 
        @Param("endDate") LocalDateTime endDate
    );
    
    @Query("SELECT s FROM StockMovement s WHERE s.relatedCredit.id = :creditId")
    List<StockMovement> findByRelatedCreditId(@Param("creditId") Long creditId);
}
