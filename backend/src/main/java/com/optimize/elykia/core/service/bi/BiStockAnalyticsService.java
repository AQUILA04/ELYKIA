package com.optimize.elykia.core.service.bi;

import com.optimize.elykia.core.dto.bi.StockAlertDto;
import com.optimize.elykia.core.entity.Articles;
import com.optimize.elykia.core.service.store.ArticlesService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class BiStockAnalyticsService {
    
    private final ArticlesService articlesService;
    
    /**
     * Alertes de stock (ruptures et stock faible)
     */
    public List<StockAlertDto> getStockAlerts() {
        List<Articles> allArticles = articlesService.getAll();
        
        return allArticles.stream()
            .filter(a -> a.getStockQuantity() == 0 || 
                        (a.getReorderPoint() != null && a.getStockQuantity() <= a.getReorderPoint()))
            .map(article -> {
                String urgency;
                Integer recommendedQty;
                Integer daysRemaining;
                
                if (article.getStockQuantity() == 0) {
                    urgency = "CRITICAL";
                    recommendedQty = article.getOptimalStockLevel() != null ? 
                        article.getOptimalStockLevel() : 20;
                    daysRemaining = 0;
                } else if (article.getStockQuantity() <= (article.getReorderPoint() != null ? article.getReorderPoint() / 2 : 5)) {
                    urgency = "HIGH";
                    recommendedQty = (article.getOptimalStockLevel() != null ? 
                        article.getOptimalStockLevel() : 20) - article.getStockQuantity();
                    daysRemaining = article.getAverageMonthlySales() != null && article.getAverageMonthlySales() > 0 ?
                        (int) ((article.getStockQuantity() / article.getAverageMonthlySales()) * 30) : 0;
                } else {
                    urgency = "MEDIUM";
                    recommendedQty = (article.getOptimalStockLevel() != null ? 
                        article.getOptimalStockLevel() : 20) - article.getStockQuantity();
                    daysRemaining = article.getAverageMonthlySales() != null && article.getAverageMonthlySales() > 0 ?
                        (int) ((article.getStockQuantity() / article.getAverageMonthlySales()) * 30) : 0;
                }
                
                return new StockAlertDto(
                    article.getId(),
                    article.getCommercialName(),
                    article.getCategory(),
                    article.getStockQuantity(),
                    article.getReorderPoint(),
                    recommendedQty,
                    urgency,
                    article.getAverageMonthlySales(),
                    daysRemaining
                );
            })
            .sorted(Comparator.comparing(StockAlertDto::getUrgency)
                .thenComparing(StockAlertDto::getCurrentStock))
            .collect(Collectors.toList());
    }
    
    /**
     * Articles en rupture de stock
     */
    public List<StockAlertDto> getOutOfStockItems() {
        return getStockAlerts().stream()
            .filter(alert -> alert.getCurrentStock() == 0)
            .collect(Collectors.toList());
    }
    
    /**
     * Articles en stock faible
     */
    public List<StockAlertDto> getLowStockItems() {
        return getStockAlerts().stream()
            .filter(alert -> alert.getCurrentStock() > 0)
            .collect(Collectors.toList());
    }
}
