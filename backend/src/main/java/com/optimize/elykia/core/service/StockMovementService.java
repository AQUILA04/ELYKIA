package com.optimize.elykia.core.service;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.entity.Articles;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.entity.StockMovement;
import com.optimize.elykia.core.enumaration.MovementType;
import com.optimize.elykia.core.repository.StockMovementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class StockMovementService extends GenericService<StockMovement, Long> {
    
    private final StockMovementRepository stockMovementRepository;

    public StockMovementService(StockMovementRepository repository,
                                StockMovementRepository stockMovementRepository) {
        super(repository);
        this.stockMovementRepository = stockMovementRepository;
    }

    public StockMovement recordMovement(Articles article, MovementType type, Integer quantity,
                                        String reason, String performedBy, Credit relatedCredit) {
        StockMovement movement = new StockMovement();
        movement.setArticle(article);
        movement.setType(type);
        movement.setQuantity(quantity);
        movement.setStockBefore(article.getStockQuantity());
        
        // Mise à jour du stock selon le type de mouvement
        int stockAfter = 0;
        if (type == MovementType.ENTRY || type == MovementType.RETURN) {
            stockAfter = article.getStockQuantity() + quantity;
        } else if (type == MovementType.RELEASE || type == MovementType.LOSS) {
            stockAfter = article.getStockQuantity() - quantity;
        }
        
        movement.setStockAfter(stockAfter);
        movement.setMovementDate(LocalDateTime.now());
        movement.setReason(reason);
        movement.setPerformedBy(performedBy);
        movement.setRelatedCredit(relatedCredit);
        movement.setUnitCost(article.getPurchasePrice());
        
        return stockMovementRepository.save(movement);
    }
    
    public List<StockMovement> getMovementsByArticle(Long articleId) {
        return stockMovementRepository.findByArticleIdOrderByMovementDateDesc(articleId);
    }
    
    public List<StockMovement> getMovementsByCredit(Long creditId) {
        return stockMovementRepository.findByRelatedCreditId(creditId);
    }
    
    public Integer getTotalSalesForArticle(Long articleId, LocalDateTime startDate, LocalDateTime endDate) {
        Integer sales = stockMovementRepository.sumQuantityByArticleAndTypeAndDateRange(
            articleId, MovementType.RELEASE, startDate, endDate
        );
        return sales != null ? sales : 0;
    }
}
